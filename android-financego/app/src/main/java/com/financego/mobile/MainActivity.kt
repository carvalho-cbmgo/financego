package com.financego.mobile

import android.app.Activity
import android.app.AlertDialog
import android.content.ComponentName
import android.content.Intent
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.animation.AlphaAnimation
import android.view.animation.Animation
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.NumberPicker
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject
import java.text.NumberFormat
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale
import java.util.concurrent.Executors
import kotlin.math.abs

class MainActivity : Activity() {
  private lateinit var store: SessionStore
  private lateinit var api: FinanceGoApi
  private val executor = Executors.newSingleThreadExecutor()
  private val mainHandler = Handler(Looper.getMainLooper())
  private var bootstrap: JSONObject? = null
  private var selectedMonth: YearMonth = YearMonth.now()
  private var includePreviousBalance = true

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    store = SessionStore(this)
    store.migrateLegacyBaseUrl()
    api = FinanceGoApi(store)
    if (store.isLoggedIn()) loadHome() else showLogin()
  }

  override fun onResume() {
    super.onResume()
    if (store.isLoggedIn() && bootstrap != null && !isNotificationListenerEnabled()) showSetup()
  }

  private fun showLogin() {
    val root = verticalRoot().apply {
      gravity = Gravity.CENTER
      setPadding(dp(22), dp(28), dp(22), dp(28))
      setBackgroundColor(COLOR_BG)
    }

    val card = surface().apply {
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dp(24), dp(26), dp(24), dp(24))
    }

    val eyebrow = chipText("acesso seguro")
    val logo = title("Finance GO", 36f).apply {
      gravity = Gravity.CENTER
      letterSpacing = 0.04f
    }
    val email = input("E-mail", store.userEmail.ifBlank { "maykocarvalho@gmail.com" })
    val password = input("Senha", "123456").apply {
      inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
    }
    val button = primaryButton("ENTRAR").apply {
      textSize = 14f
      setPadding(0, dp(10), 0, dp(10))
    }

    button.setOnClickListener {
      store.baseUrl = BuildConfig.DEFAULT_BASE_URL
      showLoading("Carregando...")
      runAsync(
        work = { api.login(email.text.toString(), password.text.toString()) },
        done = { loadHome() },
        fail = {
          showLogin()
          toast(it)
        },
      )
    }

    card.addView(eyebrow)
    card.addView(spacer(8))
    card.addView(logo)
    card.addView(spacer(18))
    card.addView(email)
    card.addView(password)
    card.addView(spacer(10))
    card.addView(button, matchWrap())
    root.addView(card, matchWrap())
    setContentView(root)
  }

  private fun loadHome() {
    showLoading("Carregando...")
    runAsync(
      work = { api.bootstrap() },
      done = {
        bootstrap = it
        store.fullName = it.optJSONObject("profile")?.optString("full_name") ?: store.fullName
        if (!isNotificationListenerEnabled() || store.fullName.isBlank()) showSetup() else showDashboard(it)
      },
      fail = {
        toast(it)
        showLogin()
      },
    )
  }

  private fun showSetup() {
    val data = bootstrap
    val root = screenRoot()
    root.addView(appHeader("Configuração", showBack = false))
    root.addView(metricCard("Configuração inicial", "Vamos validar o que falta para capturar notificações bancárias em segundo plano."))

    val fullNameOk = store.fullName.isNotBlank()
    root.addView(infoRow("Nome completo", if (fullNameOk) store.fullName else "Pendente no Perfil"))
    root.addView(infoRow("Acesso às notificações", if (isNotificationListenerEnabled()) "Ativo" else "Pendente"))

    root.addView(primaryButton("PERMITIR NOTIFICAÇÕES").apply {
      setOnClickListener { startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) }
    }, matchWrap())
    root.addView(secondaryButton("TESTAR CONFIGURAÇÃO").apply { setOnClickListener { loadHome() } }, matchWrap())
    root.addView(secondaryButton("ABRIR MESMO ASSIM").apply { setOnClickListener { showDashboard(data ?: JSONObject()) } }, matchWrap())
    setContentView(scroll(root))
  }

  private fun showDashboard(data: JSONObject) {
    bootstrap = data
    val root = screenRoot()
    root.addView(appHeader("Transações", showProfile = true))
    root.addView(monthSelector { showDashboard(data) })

    val monthRows = monthTransactions(data, null)
    val previous = previousBalance(data, null)
    addSummary(root, previous, monthRows, accountMode = false)
    root.addView(actionBar())

    root.addView(section("Contas"))
    val accounts = accountsList(data)
    if (accounts.isEmpty()) {
      root.addView(emptyState("Nenhuma conta cadastrada."))
    } else {
      for (account in accounts) root.addView(accountCard(data, account))
    }

    root.addView(section("Transações do mês"))
    addTransactionRows(root, monthRows)
    setContentView(scroll(root))
  }

  private fun showAccountPage(account: JSONObject) {
    val data = bootstrap ?: JSONObject()
    val root = screenRoot()
    root.addView(appHeader(accountTitle(account), showBack = true, showProfile = true))
    root.addView(monthSelector { showAccountPage(account) })

    val rows = monthTransactions(data, account.optString("id"))
    val initial = previousBalance(data, account.optString("id"))
    addAccountSummary(root, initial, rows)
    root.addView(section("Transações da conta"))
    addTransactionRows(root, rows)
    setContentView(scroll(root))
  }

  private fun showProfilePage() {
    val data = bootstrap ?: JSONObject()
    val profile = data.optJSONObject("profile") ?: JSONObject()
    val root = screenRoot()
    root.addView(appHeader("Perfil", showBack = true))

    val box = surface()
    box.addView(label("Nome completo"))
    val fullName = input("Nome completo", profile.optString("full_name", store.fullName))
    box.addView(fullName)
    box.addView(label("E-mail"))
    box.addView(muted(profile.optString("email", store.userEmail)))
    box.addView(spacer(14))
    box.addView(primaryButton("SALVAR PERFIL").apply {
      setOnClickListener {
        showLoading("Carregando...")
        runAsync(
          work = { api.updateProfile(fullName.text.toString()) },
          done = { loadHome() },
          fail = {
            showProfilePage()
            toast(it)
          },
        )
      }
    }, matchWrap())
    root.addView(box, matchWrap())
    setContentView(scroll(root))
  }

  private fun actionBar(): LinearLayout = LinearLayout(this).apply {
    orientation = LinearLayout.HORIZONTAL
    gravity = Gravity.CENTER
    setPadding(0, dp(8), 0, dp(10))
    addView(compactActionButton("NOVA TRANSAÇÃO", true).apply { setOnClickListener { openTransactionDialog(null) } }, weightWrap(1f))
    addView(compactActionButton("ATUALIZAR", false).apply { setOnClickListener { loadHome() } }, weightWrap(1f))
    addView(compactActionButton("SAIR", false).apply { setOnClickListener { store.clear(); showLogin() } }, weightWrap(1f))
  }

  private fun monthSelector(onChange: () -> Unit): LinearLayout = surface().apply {
    orientation = LinearLayout.VERTICAL
    setPadding(dp(14), dp(12), dp(14), dp(12))

    val row = LinearLayout(this@MainActivity).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    row.addView(iconButton("‹").apply { setOnClickListener { selectedMonth = selectedMonth.minusMonths(1); onChange() } }, fixed(dp(42), dp(42)))
    row.addView(monthButton().apply { setOnClickListener { showMonthPicker(onChange) } }, weightWrap(1f))
    row.addView(iconButton("›").apply { setOnClickListener { selectedMonth = selectedMonth.plusMonths(1); onChange() } }, fixed(dp(42), dp(42)))
    addView(row)

    addView(CheckBox(this@MainActivity).apply {
      text = "Incluir saldo anterior"
      textSize = 12f
      setTextColor(COLOR_TEXT)
      isChecked = includePreviousBalance
      setOnCheckedChangeListener { _, checked -> includePreviousBalance = checked; onChange() }
    })
  }

  private fun monthButton(): Button = secondaryButton(monthLabel(selectedMonth)).apply {
    textSize = 13f
    setTextColor(COLOR_TEXT)
    background = rounded(0xFFFFFFFF.toInt(), dp(1), 0xFFE3E7DA.toInt(), dp(14))
  }

  private fun showMonthPicker(onChange: () -> Unit) {
    val box = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      setPadding(dp(12), dp(8), dp(12), dp(8))
    }
    val monthPicker = NumberPicker(this).apply { minValue = 1; maxValue = 12; value = selectedMonth.monthValue }
    val yearPicker = NumberPicker(this).apply { minValue = 2020; maxValue = 2035; value = selectedMonth.year }
    box.addView(monthPicker)
    box.addView(yearPicker)
    AlertDialog.Builder(this)
      .setTitle("Mês de referência")
      .setView(box)
      .setNegativeButton("Cancelar", null)
      .setPositiveButton("Aplicar") { _, _ ->
        selectedMonth = YearMonth.of(yearPicker.value, monthPicker.value)
        showLoading("Carregando...")
        mainHandler.postDelayed({ onChange() }, 180)
      }
      .show()
  }

  private fun addSummary(root: LinearLayout, previous: Double, rows: List<JSONObject>, accountMode: Boolean) {
    val income = rows.filter { it.optString("type") == "credit" }.sumOf { abs(it.optDouble("amount", 0.0)) }
    val expense = rows.filter { it.optString("type") == "debit" }.sumOf { abs(it.optDouble("amount", 0.0)) }
    val net = rows.sumOf { it.optDouble("amount", 0.0) }
    val current = (if (includePreviousBalance) previous else 0.0) + net

    val grid = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
    if (includePreviousBalance) grid.addView(metricCard(if (accountMode) "Saldo inicial" else "Saldo anterior", money(previous)))
    grid.addView(metricCard("Entradas", money(income), positive = true))
    grid.addView(metricCard("Saídas", money(-expense), positive = false))
    grid.addView(metricCard(if (accountMode) "Saldo final" else "Saldo atual", money(current), highlight = true))
    root.addView(grid)
  }

  private fun addAccountSummary(root: LinearLayout, initial: Double, rows: List<JSONObject>) {
    addSummary(root, initial, rows, accountMode = true)
  }

  private fun accountCard(data: JSONObject, account: JSONObject): View {
    val balance = allTransactions(data)
      .filter { it.optString("account_id") == account.optString("id") }
      .sumOf { it.optDouble("amount", 0.0) }
    val box = surface().apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(dp(14), dp(12), dp(14), dp(12))
      setOnClickListener {
        showLoading("Carregando...")
        mainHandler.postDelayed({ showAccountPage(account) }, 160)
      }
    }
    val textBox = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
    textBox.addView(TextView(this).apply {
      text = accountTitle(account)
      textSize = 14f
      setTextColor(COLOR_TEXT)
      setTypeface(typeface, Typeface.BOLD)
    })
    textBox.addView(typeBadge(account.optString("type")))
    box.addView(textBox, weightWrap(1f))
    box.addView(TextView(this).apply {
      text = money(balance)
      textSize = 14f
      setTextColor(if (balance < 0) COLOR_DANGER else COLOR_GREEN)
      setTypeface(typeface, Typeface.BOLD)
      gravity = Gravity.END
    })
    return box
  }

  private fun addTransactionRows(root: LinearLayout, rows: List<JSONObject>) {
    if (rows.isEmpty()) {
      root.addView(emptyState("Nenhuma transação para o mês selecionado."))
      return
    }

    for (tx in rows.sortedByDescending { it.optString("posted_at") }) {
      root.addView(transactionCard(tx))
    }
  }

  private fun transactionCard(tx: JSONObject): View = surface().apply {
    orientation = LinearLayout.HORIZONTAL
    gravity = Gravity.CENTER_VERTICAL
    setPadding(dp(12), dp(10), dp(12), dp(10))
    setOnClickListener { openTransactionDialog(tx) }

    val info = LinearLayout(this@MainActivity).apply { orientation = LinearLayout.VERTICAL }
    info.addView(TextView(this@MainActivity).apply {
      text = tx.optString("description", "Transação")
      textSize = 13f
      setTextColor(COLOR_TEXT)
      setTypeface(typeface, Typeface.BOLD)
    })
    info.addView(muted("${tx.optString("app_category", "Outros")} • ${tx.optString("posted_at", "").take(10)}"))
    addView(info, weightWrap(1f))
    addView(TextView(this@MainActivity).apply {
      val amount = tx.optDouble("amount", 0.0)
      text = money(amount)
      textSize = 13f
      setTypeface(typeface, Typeface.BOLD)
      setTextColor(if (amount < 0) COLOR_DANGER else COLOR_GREEN)
      gravity = Gravity.END
    })
  }

  private fun openTransactionDialog(tx: JSONObject?) {
    val data = bootstrap ?: JSONObject()
    val accounts = accountsList(data)
    if (accounts.isEmpty()) {
      toast("Cadastre uma conta antes de criar transações.")
      return
    }

    val box = verticalRoot().apply { setPadding(dp(8), 0, dp(8), 0) }
    val typeValues = listOf("debit", "credit", "transfer")
    val typeLabels = listOf("Despesa", "Receita", "Transferência")
    val typeSpinner = spinner(typeLabels, typeValues.indexOf(tx?.optString("type") ?: "debit").coerceAtLeast(0))
    val description = input("Descrição", tx?.optString("description") ?: "")
    val originSpinner = accountSpinner(accounts, tx?.optString("account_id"))
    val destinationLabel = label("Conta Destino")
    val destinationSpinner = accountSpinner(accounts, null)
    val categoryNames = categoryNames(data)
    val currentCategory = tx?.optString("app_category") ?: "Outros"
    val categorySpinner = spinner(categoryNames, categoryNames.indexOf(currentCategory).takeIf { it >= 0 } ?: 0)
    val amount = input("Valor", abs(tx?.optDouble("amount", 0.0) ?: 0.0).takeIf { it > 0 }?.toString() ?: "").apply {
      inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
    }
    val consolidated = CheckBox(this).apply { text = "Consolidada"; isChecked = tx?.optBoolean("is_consolidated", true) ?: true }
    val repeatLabels = listOf("Sem repetição", "Parcelamento (mensal)", "Avançado")
    val repeatValues = listOf("none", "installment", "advanced")
    val repeatSpinner = spinner(repeatLabels, 0)
    val repeatBox = verticalRoot()
    val note = EditText(this).apply {
      hint = "Observações"
      minLines = 2
      maxLines = 4
      textSize = 14f
    }

    val current = input("Nº da parcela atual", "1").apply { inputType = InputType.TYPE_CLASS_NUMBER }
    val total = input("Quantidade total de parcelas", "1").apply { inputType = InputType.TYPE_CLASS_NUMBER }
    val totalAmount = input("R$ Total", "").apply { inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL }
    val repeatEvery = spinner(listOf("Semana", "Mês", "Ano"), 1)
    val forever = CheckBox(this).apply { text = "Repetir infinitamente" }

    fun rebuildRepeatBox() {
      repeatBox.removeAllViews()
      when (repeatValues[repeatSpinner.selectedItemPosition]) {
        "installment" -> {
          repeatBox.addView(current)
          repeatBox.addView(total)
          repeatBox.addView(totalAmount)
        }
        "advanced" -> {
          repeatBox.addView(label("Repetir a cada"))
          repeatBox.addView(repeatEvery)
          repeatBox.addView(forever)
          repeatBox.addView(current)
          repeatBox.addView(total)
        }
      }
    }

    fun updateTypeVisibility() {
      val isTransfer = typeValues[typeSpinner.selectedItemPosition] == "transfer"
      destinationLabel.visibility = if (isTransfer) View.VISIBLE else View.GONE
      destinationSpinner.visibility = if (isTransfer) View.VISIBLE else View.GONE
    }

    typeSpinner.onItemSelectedListener = simpleSelected { updateTypeVisibility() }
    repeatSpinner.onItemSelectedListener = simpleSelected { rebuildRepeatBox() }

    box.addView(label("Tipo")); box.addView(typeSpinner)
    box.addView(description)
    box.addView(label("Conta Origem")); box.addView(originSpinner)
    box.addView(destinationLabel); box.addView(destinationSpinner)
    box.addView(label("Categoria")); box.addView(categorySpinner)
    box.addView(amount)
    box.addView(consolidated)
    box.addView(label("Repetir Transação")); box.addView(repeatSpinner)
    box.addView(repeatBox)
    box.addView(note)
    updateTypeVisibility()
    rebuildRepeatBox()

    AlertDialog.Builder(this)
      .setTitle(if (tx == null) "Nova Transação" else "Editar Transação")
      .setView(scroll(box))
      .setNegativeButton("Cancelar", null)
      .setPositiveButton("Salvar") { _, _ ->
        val selectedType = typeValues[typeSpinner.selectedItemPosition]
        val repeatMode = repeatValues[repeatSpinner.selectedItemPosition]
        val repeatEveryValue = when (repeatEvery.selectedItemPosition) {
          0 -> "week"
          2 -> "year"
          else -> "month"
        }
        val payload = JSONObject()
          .put("id", tx?.optString("id") ?: "")
          .put("description", description.text.toString())
          .put("amount", amount.text.toString().replace(',', '.').toDoubleOrNull() ?: 0.0)
          .put("type", selectedType)
          .put("posted_at", tx?.optString("posted_at")?.take(10) ?: defaultPostedAt())
          .put("account_id", accountIdAt(accounts, originSpinner.selectedItemPosition))
          .put("destination_account_id", accountIdAt(accounts, destinationSpinner.selectedItemPosition))
          .put("category", if (selectedType == "transfer") "Transferências" else categoryNames[categorySpinner.selectedItemPosition])
          .put("is_consolidated", consolidated.isChecked)
          .put("repeat_mode", repeatMode)
          .put("repeat_every", repeatEveryValue)
          .put("repeat_forever", forever.isChecked)
          .put("installment_current", current.text.toString().toIntOrNull() ?: 1)
          .put("installment_total", total.text.toString().toIntOrNull() ?: 1)
          .put("installment_total_amount", totalAmount.text.toString().replace(',', '.').toDoubleOrNull() ?: 0.0)
          .put("note", note.text.toString())
        showLoading("Carregando...")
        runAsync(
          work = { api.saveTransaction(payload) },
          done = { loadHome() },
          fail = {
            toast(it)
            bootstrap?.let { data -> showDashboard(data) } ?: showLogin()
          },
        )
      }
      .show()
  }

  private fun simpleSelected(onSelected: () -> Unit) = object : android.widget.AdapterView.OnItemSelectedListener {
    override fun onItemSelected(parent: android.widget.AdapterView<*>?, view: View?, position: Int, id: Long) = onSelected()
    override fun onNothingSelected(parent: android.widget.AdapterView<*>?) = Unit
  }

  private fun accountsList(data: JSONObject): List<JSONObject> {
    val items = mutableListOf<JSONObject>()
    val arr = data.optJSONArray("accounts") ?: JSONArray()
    for (i in 0 until arr.length()) arr.optJSONObject(i)?.let { items.add(it) }
    return items.sortedWith(compareBy({ it.optString("institution_name") }, { it.optString("name") }))
  }

  private fun allTransactions(data: JSONObject): List<JSONObject> {
    val items = mutableListOf<JSONObject>()
    val arr = data.optJSONArray("transactions") ?: JSONArray()
    for (i in 0 until arr.length()) arr.optJSONObject(i)?.let { items.add(it) }
    return items
  }

  private fun monthTransactions(data: JSONObject, accountId: String?): List<JSONObject> {
    val start = selectedMonth.atDay(1)
    val end = selectedMonth.atEndOfMonth()
    return allTransactions(data).filter { tx ->
      val date = txDate(tx) ?: return@filter false
      val matchesAccount = accountId.isNullOrBlank() || tx.optString("account_id") == accountId
      matchesAccount && !date.isBefore(start) && !date.isAfter(end)
    }
  }

  private fun previousBalance(data: JSONObject, accountId: String?): Double {
    val start = selectedMonth.atDay(1)
    return allTransactions(data).filter { tx ->
      val date = txDate(tx) ?: return@filter false
      val matchesAccount = accountId.isNullOrBlank() || tx.optString("account_id") == accountId
      matchesAccount && date.isBefore(start)
    }.sumOf { it.optDouble("amount", 0.0) }
  }

  private fun txDate(tx: JSONObject): LocalDate? = try {
    LocalDate.parse(tx.optString("posted_at", "").take(10))
  } catch (_: Exception) {
    null
  }

  private fun defaultPostedAt(): String {
    val today = LocalDate.now()
    val day = if (YearMonth.from(today) == selectedMonth) today.dayOfMonth else 1
    return selectedMonth.atDay(day.coerceAtMost(selectedMonth.lengthOfMonth())).toString()
  }

  private fun categoryNames(data: JSONObject): List<String> {
    val names = linkedSetOf("Outros", "Transferências")
    val arr = data.optJSONArray("categories") ?: JSONArray()
    for (i in 0 until arr.length()) {
      val item = arr.optJSONObject(i)
      val name = item?.optString("name")?.trim().orEmpty()
      if (name.isNotBlank() && name != "Raiz") names.add(name)
    }
    return names.sortedWith(compareBy(String.CASE_INSENSITIVE_ORDER) { it })
  }

  private fun accountSpinner(accounts: List<JSONObject>, selectedId: String?): Spinner {
    val labels = accounts.map { accountTitle(it) }
    val selectedIndex = accounts.indexOfFirst { it.optString("id") == selectedId }.coerceAtLeast(0)
    return spinner(labels, selectedIndex)
  }

  private fun accountIdAt(accounts: List<JSONObject>, index: Int): String = accounts.getOrNull(index.coerceAtLeast(0))?.optString("id") ?: ""

  private fun accountTitle(account: JSONObject): String =
    "${account.optString("institution_name", "Banco")} - ${account.optString("name", "Conta")}".replace(Regex("\\s+"), " ").trim()

  private fun typeBadge(type: String): TextView {
    val isCredit = type.lowercase().contains("credit") || type.lowercase().contains("cart")
    return TextView(this).apply {
      text = if (isCredit) "CRÉDITO" else "CORRENTE"
      textSize = 10f
      setTextColor(if (isCredit) COLOR_DANGER else COLOR_GREEN)
      setTypeface(typeface, Typeface.BOLD)
      setPadding(dp(8), dp(2), dp(8), dp(2))
      background = rounded(0x00FFFFFF, dp(1), if (isCredit) COLOR_DANGER else COLOR_GREEN, dp(9))
    }
  }

  private fun appHeader(text: String, showBack: Boolean = false, showProfile: Boolean = false): LinearLayout = LinearLayout(this).apply {
    orientation = LinearLayout.HORIZONTAL
    gravity = Gravity.CENTER_VERTICAL
    setPadding(0, 0, 0, dp(12))
    if (showBack) addView(iconButton("‹").apply { setOnClickListener { bootstrap?.let { showDashboard(it) } ?: showLogin() } }, fixed(dp(42), dp(42)))
    addView(LinearLayout(this@MainActivity).apply {
      orientation = LinearLayout.VERTICAL
      addView(title("Finance GO", 20f))
      addView(muted(text))
    }, weightWrap(1f))
    if (showProfile) addView(secondaryButton("Perfil").apply { setOnClickListener { showProfilePage() } }, fixed(dp(92), dp(42)))
  }

  private fun isNotificationListenerEnabled(): Boolean {
    val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners") ?: return false
    val me = ComponentName(this, FinanceNotificationListener::class.java).flattenToString()
    return flat.split(':').any { it.equals(me, ignoreCase = true) }
  }

  private fun showLoading(text: String) {
    val root = verticalRoot().apply {
      gravity = Gravity.CENTER
      setPadding(dp(24), dp(24), dp(24), dp(24))
      setBackgroundColor(COLOR_BG)
    }
    val card = surface().apply {
      gravity = Gravity.CENTER
      setPadding(dp(28), dp(28), dp(28), dp(28))
    }
    val loadingText = title(text, 22f).apply { gravity = Gravity.CENTER }
    loadingText.startAnimation(AlphaAnimation(0.35f, 1f).apply {
      duration = 650
      repeatMode = Animation.REVERSE
      repeatCount = Animation.INFINITE
    })
    card.addView(ProgressBar(this))
    card.addView(spacer(12))
    card.addView(loadingText)
    root.addView(card, matchWrap())
    setContentView(root)
  }

  private fun runAsync(work: () -> JSONObject, done: (JSONObject) -> Unit, fail: (String) -> Unit) {
    executor.execute {
      try {
        val result = work()
        mainHandler.post { done(result) }
      } catch (error: Exception) {
        mainHandler.post { fail(error.message ?: "Erro inesperado") }
      }
    }
  }

  private fun screenRoot(): LinearLayout = verticalRoot().apply {
    setPadding(dp(14), dp(18), dp(14), dp(28))
    setBackgroundColor(COLOR_BG)
  }

  private fun verticalRoot(): LinearLayout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
  private fun scroll(view: View): ScrollView = ScrollView(this).apply { setBackgroundColor(COLOR_BG); addView(view) }
  private fun spacer(size: Int): View = View(this).apply { layoutParams = LinearLayout.LayoutParams(1, dp(size)) }
  private fun title(text: String, size: Float): TextView = TextView(this).apply { this.text = text; textSize = size; setTextColor(COLOR_TEXT); setTypeface(typeface, Typeface.BOLD) }
  private fun section(text: String): TextView = title(text, 17f).apply { setPadding(0, dp(16), 0, dp(6)) }
  private fun muted(text: String): TextView = TextView(this).apply { this.text = text; textSize = 12f; setTextColor(COLOR_MUTED); setPadding(0, dp(3), 0, dp(6)) }
  private fun label(text: String): TextView = TextView(this).apply { this.text = text; textSize = 12f; setTextColor(COLOR_MUTED); setPadding(0, dp(8), 0, dp(3)) }
  private fun input(hint: String, value: String): EditText = EditText(this).apply { this.hint = hint; setText(value); textSize = 14f; setSingleLine(true); setPadding(dp(12), dp(8), dp(12), dp(8)) }

  private fun primaryButton(text: String): Button = Button(this).apply { this.text = text; setTextColor(0xFFFFFFFF.toInt()); background = rounded(COLOR_PRIMARY, 0, 0, dp(14)); setTypeface(typeface, Typeface.BOLD) }
  private fun secondaryButton(text: String): Button = Button(this).apply { this.text = text; setTextColor(COLOR_TEXT); background = rounded(0xFFFFFFFF.toInt(), dp(1), 0xFFE0E5D8.toInt(), dp(14)); setTypeface(typeface, Typeface.BOLD) }
  private fun compactActionButton(text: String, primary: Boolean): Button =
    (if (primary) primaryButton(text) else secondaryButton(text)).apply { textSize = 10f; setSingleLine(true); setPadding(0, 0, 0, 0) }
  private fun iconButton(text: String): Button = secondaryButton(text).apply { textSize = 22f; setPadding(0, 0, 0, dp(2)) }
  private fun chipText(text: String): TextView = TextView(this).apply { this.text = text.uppercase(); textSize = 11f; letterSpacing = 0.12f; setTextColor(COLOR_PRIMARY); setTypeface(typeface, Typeface.BOLD); gravity = Gravity.CENTER }

  private fun surface(): LinearLayout = verticalRoot().apply {
    setPadding(dp(14), dp(12), dp(14), dp(12))
    background = rounded(0xFFFFFFFF.toInt(), dp(1), 0xFFE6EBDD.toInt(), dp(18))
    val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
    lp.setMargins(0, dp(5), 0, dp(7))
    layoutParams = lp
  }

  private fun metricCard(label: String, value: String, positive: Boolean? = null, highlight: Boolean = false): TextView = TextView(this).apply {
    text = "$label\n$value"
    textSize = if (highlight) 20f else 16f
    setTextColor(when {
      positive == true -> COLOR_GREEN
      positive == false -> COLOR_DANGER
      else -> COLOR_TEXT
    })
    setTypeface(typeface, Typeface.BOLD)
    setPadding(dp(16), dp(14), dp(16), dp(14))
    background = rounded(if (highlight) 0xFFEAF4D8.toInt() else 0xFFFFFFFF.toInt(), dp(1), 0xFFE5EBDD.toInt(), dp(18))
    val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
    lp.setMargins(0, dp(4), 0, dp(6))
    layoutParams = lp
  }

  private fun infoRow(label: String, value: String): TextView = TextView(this).apply {
    text = "$label\n$value"
    textSize = 13f
    setTextColor(COLOR_TEXT)
    setPadding(dp(14), dp(10), dp(14), dp(10))
    background = rounded(0xFFFFFFFF.toInt(), dp(1), 0xFFE6EBDD.toInt(), dp(16))
  }

  private fun emptyState(text: String): TextView = muted(text).apply {
    gravity = Gravity.CENTER
    setPadding(dp(12), dp(18), dp(12), dp(18))
    background = rounded(0xFFFFFFFF.toInt(), dp(1), 0xFFE6EBDD.toInt(), dp(16))
  }

  private fun spinner(items: List<String>, selected: Int = 0): Spinner = Spinner(this).apply {
    adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, items)
    setSelection(selected.coerceIn(0, (items.size - 1).coerceAtLeast(0)))
  }

  private fun rounded(color: Int, strokeWidth: Int, strokeColor: Int, radius: Int): GradientDrawable = GradientDrawable().apply {
    setColor(color)
    cornerRadius = radius.toFloat()
    if (strokeWidth > 0) setStroke(strokeWidth, strokeColor)
  }

  private fun matchWrap(): LinearLayout.LayoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
  private fun weightWrap(weight: Float): LinearLayout.LayoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, weight).apply { setMargins(dp(3), dp(3), dp(3), dp(3)) }
  private fun fixed(width: Int, height: Int): LinearLayout.LayoutParams = LinearLayout.LayoutParams(width, height).apply { setMargins(dp(3), dp(3), dp(3), dp(3)) }
  private fun money(value: Double): String = NumberFormat.getCurrencyInstance(Locale("pt", "BR")).format(value)
  private fun monthLabel(month: YearMonth): String = "${month.month.getDisplayName(TextStyle.FULL, Locale("pt", "BR")).replaceFirstChar { it.titlecase(Locale("pt", "BR")) }}/${month.year}"
  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
  private fun toast(text: String) = Toast.makeText(this, text, Toast.LENGTH_LONG).show()

  companion object {
    private val COLOR_BG = 0xFFF4F7EF.toInt()
    private val COLOR_TEXT = 0xFF172033.toInt()
    private val COLOR_MUTED = 0xFF667085.toInt()
    private val COLOR_PRIMARY = 0xFF6E9B18.toInt()
    private val COLOR_GREEN = 0xFF139B5A.toInt()
    private val COLOR_DANGER = 0xFFC62828.toInt()
  }
}
