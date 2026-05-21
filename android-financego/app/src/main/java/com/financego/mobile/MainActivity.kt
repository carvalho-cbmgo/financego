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
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.animation.AlphaAnimation
import android.view.animation.Animation
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.FrameLayout
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
  private data class CategoryOption(val name: String, val label: String)
  private data class PeriodRange(val start: LocalDate, val end: LocalDate)
  private enum class PeriodMode { TO_DATE, FUTURE, FULL_MONTH }

  private lateinit var store: SessionStore
  private lateinit var api: FinanceGoApi
  private val executor = Executors.newSingleThreadExecutor()
  private val mainHandler = Handler(Looper.getMainLooper())
  private var bootstrap: JSONObject? = null
  private var selectedMonth: YearMonth = YearMonth.now()
  private var includePreviousBalance = true
  private var selectedPeriodMode = PeriodMode.FULL_MONTH

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
    root.addView(periodSelector { showDashboard(data) })
    root.addView(monthSelector { showDashboard(data) })

    val monthRows = monthTransactions(data, null)
    val previous = previousBalance(data, null)
    addSummary(root, previous, monthRows, accountMode = false)

    root.addView(section("Contas"))
    val accounts = accountsList(data)
    if (accounts.isEmpty()) {
      root.addView(emptyState("Nenhuma conta cadastrada."))
    } else {
      for (account in accounts) root.addView(accountCard(data, account))
    }

    root.addView(section("Transações do mês"))
    addTransactionRows(root, monthRows)
    setContentViewWithFab(root)
  }

  private fun showAccountPage(account: JSONObject) {
    val data = bootstrap ?: JSONObject()
    val root = screenRoot()
    root.addView(appHeader(accountTitle(account), showBack = true, showProfile = true))
    root.addView(periodSelector { showAccountPage(account) })
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

  private fun periodSelector(onChange: () -> Unit): LinearLayout = surface().apply {
    orientation = LinearLayout.VERTICAL
    setPadding(dp(14), dp(10), dp(14), dp(10))
    addView(muted("Período de cálculo"))
    val labels = periodLabels()
    val selector = spinner(labels, selectedPeriodMode.ordinal)
    selector.onItemSelectedListener = simpleSelected {
      val next = PeriodMode.values().getOrElse(selector.selectedItemPosition) { PeriodMode.FULL_MONTH }
      if (next != selectedPeriodMode) {
        selectedPeriodMode = next
        onChange()
      }
    }
    addView(selector)
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
    val income = rows.filter { it.optString("type") == "credit" }.sumOf { abs(transactionAmount(it)) }
    val expense = rows.filter { it.optString("type") == "debit" }.sumOf { abs(transactionAmount(it)) }
    val net = rows.sumOf { transactionAmount(it) }
    val current = (if (includePreviousBalance) previous else 0.0) + net

    val panel = surface().apply {
      setPadding(dp(14), dp(10), dp(14), dp(10))
    }
    if (includePreviousBalance) panel.addView(summaryLine(if (accountMode) "Saldo inicial" else "Saldo anterior", money(previous)))
    panel.addView(summaryLine("Entradas", money(income), COLOR_GREEN))
    panel.addView(summaryLine("Saídas", money(-expense), COLOR_DANGER))
    panel.addView(summaryLine(if (accountMode) "Saldo final" else "Saldo atual", money(current), COLOR_TEXT, true))
    root.addView(panel)
  }

  private fun addAccountSummary(root: LinearLayout, initial: Double, rows: List<JSONObject>) {
    addSummary(root, initial, rows, accountMode = true)
  }

  private fun accountCard(data: JSONObject, account: JSONObject): View {
    val balance = accountBalance(data, account)
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
    val data = bootstrap ?: JSONObject()
    val account = accountForTransaction(data, tx.optString("account_id"))
    orientation = LinearLayout.HORIZONTAL
    gravity = Gravity.CENTER_VERTICAL
    setPadding(dp(12), dp(10), dp(12), dp(10))
    setOnClickListener { openTransactionForEdit(tx) }

    val info = LinearLayout(this@MainActivity).apply { orientation = LinearLayout.VERTICAL }
    info.addView(TextView(this@MainActivity).apply {
      val date = formatDateForInput(tx.optString("posted_at", "").take(10))
      text = "$date - ${stripRecurrenceSuffix(tx.optString("description", "Transação"))}"
      textSize = 13f
      setTextColor(COLOR_TEXT)
      setTypeface(typeface, Typeface.BOLD)
    })

    val tagRow = LinearLayout(this@MainActivity).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(0, dp(5), 0, dp(5))
    }
    tagRow.addView(outlineBadge(tx.optString("app_category", "Outros"), COLOR_GREEN))
    recurrenceBadgeText(tx)?.let { tagRow.addView(outlineBadge(it, COLOR_BLUE)) }
    info.addView(tagRow)

    val accountRow = LinearLayout(this@MainActivity).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    accountRow.addView(TextView(this@MainActivity).apply {
      text = account?.let { accountTitle(it) } ?: "Conta não identificada"
      textSize = 12f
      setTextColor(COLOR_MUTED)
      setSingleLine(false)
    }, weightWrap(1f))
    accountRow.addView(typeBadge(account?.optString("type") ?: "", topMargin = 0))
    info.addView(accountRow)

    addView(info, weightWrap(1f))
    addView(TextView(this@MainActivity).apply {
      val displayAmount = transactionAmount(tx)
      text = money(displayAmount)
      textSize = 13f
      setTypeface(typeface, Typeface.BOLD)
      setTextColor(if (displayAmount < 0) COLOR_DANGER else COLOR_GREEN)
      gravity = Gravity.END
    })
  }

  private fun openTransactionForEdit(tx: JSONObject) {
    if (isRepeatedTransaction(tx) && !tx.optBoolean("is_consolidated", true)) {
      showRecurringEditChoice(tx)
      return
    }
    openTransactionDialog(tx)
  }

  private fun showRecurringEditChoice(tx: JSONObject) {
    val box = verticalRoot().apply { setPadding(dp(16), dp(8), dp(16), dp(4)) }
    box.addView(TextView(this).apply {
      text = "A transação possui repetição. Qual ação deseja executar?"
      textSize = 15f
      setTextColor(COLOR_TEXT)
      setTypeface(typeface, Typeface.BOLD)
      setPadding(0, 0, 0, dp(10))
    })
    val options = listOf(
      "single" to "Alterar apenas esta",
      "from_current" to "Alterar a partir desta",
      "from_first" to "Alterar a partir da primeira",
    )
    var selectedScope = "single"
    val checks = mutableListOf<CheckBox>()
    for ((value, labelText) in options) {
      val check = CheckBox(this).apply {
        text = labelText
        textSize = 14f
        setTextColor(COLOR_TEXT)
        isChecked = value == selectedScope
        setOnClickListener {
          selectedScope = value
          checks.forEach { item -> item.isChecked = item === this }
        }
      }
      checks.add(check)
      box.addView(check)
    }
    val dialog = AlertDialog.Builder(this)
      .setView(box)
      .setNegativeButton("Cancelar", null)
      .setPositiveButton("Alterar", null)
      .create()
    dialog.setOnShowListener {
      dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
        dialog.dismiss()
        openTransactionDialog(tx, selectedScope)
      }
    }
    dialog.show()
  }

  private fun openTransactionDialog(tx: JSONObject?, repeatScope: String = "single") {
    val data = bootstrap ?: JSONObject()
    val accounts = accountsList(data)
    if (accounts.isEmpty()) {
      toast("Cadastre uma conta antes de criar transações.")
      return
    }

    val box = verticalRoot().apply { setPadding(dp(10), 0, dp(10), 0) }
    val deleteButton = tx?.let {
      secondaryButton("Excluir").apply {
        textSize = 12f
        setTextColor(COLOR_DANGER)
        background = rounded(0xFFFFF5F5.toInt(), dp(1), COLOR_DANGER, dp(12))
      }
    }
    box.addView(LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(0, dp(4), 0, dp(12))
      addView(title(if (tx == null) "Nova Transação" else "Editar Transação", 18f), weightWrap(1f))
      deleteButton?.let { addView(it, fixed(dp(96), dp(40))) }
    })

    val typeValues = listOf("debit", "credit", "transfer")
    val typeLabels = listOf("Despesa", "Receita", "Transferência")
    val typeSpinner = spinner(typeLabels, typeValues.indexOf(tx?.optString("type") ?: "debit").coerceAtLeast(0))
    val postedAt = input("DD/MM/AAAA", formatDateForInput(tx?.optString("posted_at")?.take(10) ?: defaultPostedAt())).apply {
      inputType = InputType.TYPE_CLASS_DATETIME
    }
    val description = input("Descrição", stripRecurrenceSuffix(tx?.optString("description") ?: ""))
    val originSpinner = accountSpinner(accounts, tx?.optString("account_id"))
    val destinationSpinner = accountSpinner(accounts, null)
    val categories = categoryOptions(data)
    val currentCategory = tx?.optString("app_category") ?: "Outros"
    val fallbackCategory = categories.indexOfFirst { it.name == "Outros" }.coerceAtLeast(0)
    val categoryIndex = categories.indexOfFirst { it.name == currentCategory }.takeIf { it >= 0 } ?: fallbackCategory
    val categorySpinner = spinner(categories.map { it.label }, categoryIndex)
    val amount = input("0,00", abs(transactionAmount(tx ?: JSONObject())).takeIf { it > 0 }?.toString() ?: "").apply {
      inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
    }
    val consolidated = CheckBox(this).apply {
      text = "Consolidada"
      textSize = 13f
      setTextColor(COLOR_TEXT)
      isChecked = tx?.optBoolean("is_consolidated", true) ?: true
    }
    val repeatLabels = listOf("Sem repetição", "Parcelamento (mensal)", "Avançado")
    val repeatValues = listOf("none", "installment", "advanced")
    val initialRepeatMode = repeatModeForTransaction(tx)
    val repeatSpinner = spinner(repeatLabels, repeatValues.indexOf(initialRepeatMode).coerceAtLeast(0))
    val repeatBox = verticalRoot()
    val note = EditText(this).apply {
      hint = "Observações"
      minLines = 2
      maxLines = 4
      textSize = 14f
      setPadding(dp(12), dp(8), dp(12), dp(8))
      background = rounded(0xFFFFFFFF.toInt(), dp(1), 0xFFD9E0CF.toInt(), dp(12))
    }

    val current = input("1", tx?.optInt("installment_current", 1)?.takeIf { it > 0 }?.toString() ?: "1").apply { inputType = InputType.TYPE_CLASS_NUMBER }
    val total = input("1", tx?.optInt("installment_total", 1)?.takeIf { it > 0 }?.toString() ?: "1").apply { inputType = InputType.TYPE_CLASS_NUMBER }
    val totalAmount = input("R$ Total", "").apply {
      isEnabled = false
      setTextColor(COLOR_TEXT)
      background = rounded(0xFFEFF4E8.toInt(), dp(1), 0xFFD9E0CF.toInt(), dp(12))
    }
    val repeatEvery = spinner(listOf("Semana", "Mês", "Ano"), 1)
    val forever = CheckBox(this).apply {
      text = "Repetir infinitamente"
      textSize = 13f
      setTextColor(COLOR_TEXT)
    }

    fun rebuildRepeatBox() {
      repeatBox.removeAllViews()
      when (repeatValues[repeatSpinner.selectedItemPosition]) {
        "installment" -> {
          repeatBox.addView(fieldRow("Nº parcela atual", current))
          repeatBox.addView(fieldRow("Total parcelas", total))
          repeatBox.addView(fieldRow("R$ Total", totalAmount))
        }
        "advanced" -> {
          repeatBox.addView(fieldRow("Repetir a cada", repeatEvery))
          repeatBox.addView(fieldRow("Repetir infinitamente", forever))
          repeatBox.addView(fieldRow("Nº parcela atual", current))
          repeatBox.addView(fieldRow("Total parcelas", total))
          repeatBox.addView(fieldRow("R$ Total", totalAmount))
        }
      }
    }

    fun updateTotalAmount() {
      val amountValue = parseAmountInput(amount.text.toString())
      val totalParcels = total.text.toString().toIntOrNull()?.coerceAtLeast(1) ?: 1
      totalAmount.setText(money(abs(amountValue) * totalParcels))
    }

    lateinit var destinationRow: LinearLayout
    fun updateTypeVisibility() {
      val isTransfer = typeValues[typeSpinner.selectedItemPosition] == "transfer"
      destinationRow.visibility = if (isTransfer) View.VISIBLE else View.GONE
      categorySpinner.isEnabled = !isTransfer
      if (isTransfer) {
        val transferIndex = categories.indexOfFirst { it.name == "Transferências" }
        if (transferIndex >= 0) categorySpinner.setSelection(transferIndex)
      }
    }

    destinationRow = fieldRow("Conta Destino", destinationSpinner)
    typeSpinner.onItemSelectedListener = simpleSelected { updateTypeVisibility() }
    repeatSpinner.onItemSelectedListener = simpleSelected { rebuildRepeatBox(); updateTotalAmount() }
    watchText(amount) { updateTotalAmount() }
    watchText(total) { updateTotalAmount() }

    box.addView(fieldRow("Data", postedAt))
    box.addView(fieldRow("Tipo", typeSpinner))
    box.addView(fieldRow("Descrição", description))
    box.addView(fieldRow("Conta Origem", originSpinner))
    box.addView(destinationRow)
    box.addView(fieldRow("Categoria", categorySpinner))
    box.addView(fieldRow("Valor", amount))
    box.addView(fieldRow("Consolidada", consolidated))
    box.addView(fieldRow("Repetir Transação", repeatSpinner))
    box.addView(repeatBox)
    box.addView(fieldRow("Observações", note))

    val actions = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      setPadding(0, dp(14), 0, dp(4))
    }
    val cancelButton = secondaryButton("Cancelar")
    val saveButton = primaryButton("Salvar")
    actions.addView(cancelButton, fixed(dp(118), dp(46)))
    actions.addView(saveButton, fixed(dp(118), dp(46)))
    box.addView(actions)

    updateTypeVisibility()
    rebuildRepeatBox()
    updateTotalAmount()

    val dialog = AlertDialog.Builder(this)
      .setView(scroll(box))
      .create()

    cancelButton.setOnClickListener { dialog.dismiss() }
    deleteButton?.setOnClickListener {
      AlertDialog.Builder(this)
        .setTitle("Excluir transação")
        .setMessage("Deseja realmente excluir esta transação?")
        .setNegativeButton("Cancelar", null)
        .setPositiveButton("Excluir") { _, _ ->
          dialog.dismiss()
          showLoading("Carregando...")
          runAsync(
            work = { api.deleteTransaction(tx.optString("id"), repeatScope) },
            done = { loadHome() },
            fail = {
              toast(it)
              bootstrap?.let { data -> showDashboard(data) } ?: showLogin()
            },
          )
        }
        .show()
    }
    saveButton.setOnClickListener {
      val selectedType = typeValues[typeSpinner.selectedItemPosition]
      val repeatMode = repeatValues[repeatSpinner.selectedItemPosition]
      val repeatEveryValue = when (repeatEvery.selectedItemPosition) {
        0 -> "week"
        2 -> "year"
        else -> "month"
      }
      val selectedCategory = if (selectedType == "transfer") "Transferências" else categoryNameAt(categories, categorySpinner.selectedItemPosition)
      val payload = JSONObject()
        .put("id", tx?.optString("id") ?: "")
        .put("description", description.text.toString())
        .put("amount", parseAmountInput(amount.text.toString()))
        .put("type", selectedType)
        .put("posted_at", parseDateInput(postedAt.text.toString()))
        .put("account_id", accountIdAt(accounts, originSpinner.selectedItemPosition))
        .put("destination_account_id", accountIdAt(accounts, destinationSpinner.selectedItemPosition))
        .put("category", selectedCategory)
        .put("is_consolidated", consolidated.isChecked)
        .put("repeat_scope", repeatScope)
        .put("repeat_mode", repeatMode)
        .put("repeat_every", repeatEveryValue)
        .put("repeat_forever", forever.isChecked)
        .put("installment_current", current.text.toString().toIntOrNull() ?: 1)
        .put("installment_total", total.text.toString().toIntOrNull() ?: 1)
        .put("installment_total_amount", abs(parseAmountInput(amount.text.toString())) * (total.text.toString().toIntOrNull()?.coerceAtLeast(1) ?: 1))
        .put("note", note.text.toString())
      dialog.dismiss()
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

    dialog.show()
  }

  private fun simpleSelected(onSelected: () -> Unit) = object : android.widget.AdapterView.OnItemSelectedListener {
    override fun onItemSelected(parent: android.widget.AdapterView<*>?, view: View?, position: Int, id: Long) = onSelected()
    override fun onNothingSelected(parent: android.widget.AdapterView<*>?) = Unit
  }

  private fun watchText(input: EditText, afterChange: () -> Unit) {
    input.addTextChangedListener(object : TextWatcher {
      override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
      override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit
      override fun afterTextChanged(s: Editable?) = afterChange()
    })
  }

  private fun parseAmountInput(value: String): Double {
    val clean = value.trim().replace("R$", "", ignoreCase = true).replace(" ", "")
    val normalized = if (clean.contains(",")) clean.replace(".", "").replace(',', '.') else clean
    return normalized.toDoubleOrNull() ?: 0.0
  }

  private fun stripRecurrenceSuffix(value: String): String =
    value
      .replace(Regex("""\s*-\s*\d+\s+de\s+\d+\s*$""", RegexOption.IGNORE_CASE), "")
      .replace(Regex("""\s*-\s*recorrente\s*#\d+\s*$""", RegexOption.IGNORE_CASE), "")
      .trim()

  private fun isRepeatedTransaction(tx: JSONObject): Boolean {
    val mode = repeatModeForTransaction(tx)
    return mode == "installment" || mode == "advanced"
  }

  private fun repeatModeForTransaction(tx: JSONObject?): String {
    if (tx == null) return "none"
    val mode = tx.optJSONObject("raw")?.optJSONObject("recurrence")?.optString("mode").orEmpty()
    if (mode == "installment" || mode == "advanced") return mode
    if (tx.optInt("installment_current", 0) > 0) return "installment"
    return "none"
  }

  private fun recurrenceBadgeText(tx: JSONObject): String? {
    return when (repeatModeForTransaction(tx)) {
      "installment" -> installmentLabel(tx)
      "advanced" -> "Recorrente"
      else -> null
    }
  }

  private fun installmentLabel(tx: JSONObject): String {
    val current = tx.optInt("installment_current", 0)
    val total = tx.optInt("installment_total", 0)
    if (current > 0 && total > 0) return "Parcela $current de $total"
    return "Parcelamento"
  }

  private fun transactionAmount(tx: JSONObject): Double {
    val raw = tx.optDouble("amount", 0.0)
    return when (tx.optString("type").lowercase()) {
      "debit" -> -abs(raw)
      "credit" -> abs(raw)
      "transfer" -> raw
      else -> raw
    }
  }

  private fun accountBalance(data: JSONObject, account: JSONObject): Double {
    val accountId = account.optString("id")
    val range = periodRange()
    val previous = if (includePreviousBalance) {
      allTransactions(data).filter { tx ->
        val date = txDate(tx) ?: return@filter false
        tx.optString("account_id") == accountId && date.isBefore(range.start)
      }.sumOf { transactionAmount(it) }
    } else {
      0.0
    }
    val periodNet = allTransactions(data).filter { tx ->
      val date = txDate(tx) ?: return@filter false
      tx.optString("account_id") == accountId && !date.isBefore(range.start) && !date.isAfter(range.end)
    }.sumOf { transactionAmount(it) }
    return previous + periodNet
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
    val range = periodRange()
    return allTransactions(data).filter { tx ->
      val date = txDate(tx) ?: return@filter false
      val matchesAccount = accountId.isNullOrBlank() || tx.optString("account_id") == accountId
      matchesAccount && !date.isBefore(range.start) && !date.isAfter(range.end)
    }
  }

  private fun previousBalance(data: JSONObject, accountId: String?): Double {
    val start = periodRange().start
    return allTransactions(data).filter { tx ->
      val date = txDate(tx) ?: return@filter false
      val matchesAccount = accountId.isNullOrBlank() || tx.optString("account_id") == accountId
      matchesAccount && date.isBefore(start)
    }.sumOf { transactionAmount(it) }
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

  private fun periodRange(): PeriodRange {
    val first = selectedMonth.atDay(1)
    val last = selectedMonth.atEndOfMonth()
    val today = LocalDate.now()
    return when (selectedPeriodMode) {
      PeriodMode.TO_DATE -> PeriodRange(first, if (YearMonth.from(today) == selectedMonth) today else last)
      PeriodMode.FUTURE -> {
        val start = if (YearMonth.from(today) == selectedMonth) today.plusDays(1) else first
        PeriodRange(start, last)
      }
      PeriodMode.FULL_MONTH -> PeriodRange(first, last)
    }
  }

  private fun periodLabels(): List<String> {
    val month = selectedMonth.month.getDisplayName(TextStyle.FULL, Locale("pt", "BR")).uppercase(Locale("pt", "BR"))
    return listOf(
      "Início de $month até hoje",
      "Amanhã até o final de $month",
      "$month (1 a ${selectedMonth.lengthOfMonth()})",
    )
  }

  private fun categoryOptions(data: JSONObject): List<CategoryOption> {
    val options = mutableListOf<CategoryOption>()
    val seen = linkedSetOf<String>()
    fun add(name: String, depth: Int = 0) {
      val clean = name.trim()
      if (clean.isBlank() || clean == "Raiz" || !seen.add(clean)) return
      val prefix = "    ".repeat(depth.coerceAtLeast(0))
      options.add(CategoryOption(clean, "$prefix$clean"))
    }

    add("Outros")
    add("Transferências")
    val arr = data.optJSONArray("categories") ?: JSONArray()
    for (i in 0 until arr.length()) {
      val item = arr.optJSONObject(i)
      val name = item?.optString("name")?.trim().orEmpty()
      val depth = item?.optInt("depth", 0) ?: 0
      add(name, depth)
    }
    return options
  }

  private fun categoryNameAt(categories: List<CategoryOption>, index: Int): String =
    categories.getOrNull(index.coerceAtLeast(0))?.name ?: "Outros"

  private fun formatDateForInput(value: String): String {
    return try {
      val date = LocalDate.parse(value.take(10))
      "%02d/%02d/%04d".format(date.dayOfMonth, date.monthValue, date.year)
    } catch (_: Exception) {
      value
    }
  }

  private fun parseDateInput(value: String): String {
    val clean = value.trim()
    return try {
      if (Regex("""\d{4}-\d{2}-\d{2}""").matches(clean)) return clean
      val match = Regex("""(\d{1,2})/(\d{1,2})/(\d{2,4})""").matchEntire(clean)
      if (match != null) {
        val day = match.groupValues[1].toInt().coerceIn(1, 31)
        val month = match.groupValues[2].toInt().coerceIn(1, 12)
        var year = match.groupValues[3].toInt()
        if (year < 100) year += 2000
        return LocalDate.of(year, month, day).toString()
      }
      defaultPostedAt()
    } catch (_: Exception) {
      defaultPostedAt()
    }
  }

  private fun accountSpinner(accounts: List<JSONObject>, selectedId: String?): Spinner {
    val labels = accounts.map { accountTitle(it) }
    val selectedIndex = accounts.indexOfFirst { it.optString("id") == selectedId }.coerceAtLeast(0)
    return spinner(labels, selectedIndex)
  }

  private fun accountIdAt(accounts: List<JSONObject>, index: Int): String = accounts.getOrNull(index.coerceAtLeast(0))?.optString("id") ?: ""

  private fun accountForTransaction(data: JSONObject, accountId: String): JSONObject? =
    accountsList(data).firstOrNull { it.optString("id") == accountId }

  private fun accountTitle(account: JSONObject): String =
    "${account.optString("institution_name", "Banco")} - ${account.optString("name", "Conta")}".replace(Regex("\\s+"), " ").trim()

  private fun outlineBadge(text: String, color: Int): TextView =
    TextView(this).apply {
      this.text = text.ifBlank { "Sem categoria" }
      textSize = 10f
      setTextColor(color)
      setTypeface(typeface, Typeface.BOLD)
      setSingleLine(true)
      setPadding(dp(8), dp(2), dp(8), dp(2))
      background = rounded(0x00FFFFFF, dp(1), color, dp(9))
      layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
        setMargins(0, 0, dp(6), 0)
      }
    }

  private fun typeBadge(type: String, topMargin: Int = 4): TextView {
    val isCredit = type.lowercase().contains("credit") || type.lowercase().contains("cart")
    return TextView(this).apply {
      text = if (isCredit) "CRÉDITO" else "CORRENTE"
      textSize = 10f
      setTextColor(if (isCredit) COLOR_DANGER else COLOR_GREEN)
      setTypeface(typeface, Typeface.BOLD)
      setPadding(dp(8), dp(2), dp(8), dp(2))
      background = rounded(0x00FFFFFF, dp(1), if (isCredit) COLOR_DANGER else COLOR_GREEN, dp(9))
      layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
        setMargins(dp(6), dp(topMargin), 0, 0)
      }
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
    if (showProfile) {
      addView(iconActionButton("⟳", "Atualizar dados").apply { setOnClickListener { loadHome() } }, fixed(dp(42), dp(42)))
      addView(iconActionButton("\uD83D\uDC64", "Perfil").apply { setOnClickListener { showProfilePage() } }, fixed(dp(42), dp(42)))
      addView(iconActionButton("⇥", "Sair").apply { setOnClickListener { store.clear(); showLogin() } }, fixed(dp(42), dp(42)))
    }
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
  private fun setContentViewWithFab(root: LinearLayout) {
    val frame = FrameLayout(this).apply { setBackgroundColor(COLOR_BG) }
    frame.addView(scroll(root), FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
    val fab = primaryButton("+").apply {
      textSize = 28f
      contentDescription = "Nova transação"
      setPadding(0, 0, 0, dp(4))
      background = rounded(COLOR_PRIMARY, 0, 0, dp(32))
      setOnClickListener { openTransactionDialog(null) }
    }
    frame.addView(fab, FrameLayout.LayoutParams(dp(62), dp(62)).apply {
      gravity = Gravity.BOTTOM or Gravity.END
      setMargins(0, 0, dp(18), dp(22))
    })
    setContentView(frame)
  }
  private fun spacer(size: Int): View = View(this).apply { layoutParams = LinearLayout.LayoutParams(1, dp(size)) }
  private fun title(text: String, size: Float): TextView = TextView(this).apply { this.text = text; textSize = size; setTextColor(COLOR_TEXT); setTypeface(typeface, Typeface.BOLD) }
  private fun section(text: String): TextView = title(text, 17f).apply { setPadding(0, dp(16), 0, dp(6)) }
  private fun muted(text: String): TextView = TextView(this).apply { this.text = text; textSize = 12f; setTextColor(COLOR_MUTED); setPadding(0, dp(3), 0, dp(6)) }
  private fun label(text: String): TextView = TextView(this).apply { this.text = text; textSize = 12f; setTextColor(COLOR_MUTED); setPadding(0, dp(8), 0, dp(3)) }
  private fun input(hint: String, value: String): EditText = EditText(this).apply { this.hint = hint; setText(value); textSize = 14f; setSingleLine(true); setPadding(dp(12), dp(8), dp(12), dp(8)) }

  private fun primaryButton(text: String): Button = Button(this).apply { this.text = text; setTextColor(0xFFFFFFFF.toInt()); background = rounded(COLOR_PRIMARY, 0, 0, dp(14)); setTypeface(typeface, Typeface.BOLD) }
  private fun secondaryButton(text: String): Button = Button(this).apply { this.text = text; setTextColor(COLOR_TEXT); background = rounded(0xFFFFFFFF.toInt(), dp(1), 0xFFE0E5D8.toInt(), dp(14)); setTypeface(typeface, Typeface.BOLD) }
  private fun iconActionButton(symbol: String, description: String): Button = secondaryButton(symbol).apply {
    contentDescription = description
    textSize = 20f
    setPadding(0, 0, 0, dp(2))
  }
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

  private fun summaryLine(label: String, value: String, valueColor: Int = COLOR_TEXT, strong: Boolean = false): LinearLayout =
    LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(0, dp(7), 0, dp(7))
      addView(TextView(this@MainActivity).apply {
        text = label
        textSize = if (strong) 15f else 14f
        setTextColor(COLOR_MUTED)
        setTypeface(typeface, if (strong) Typeface.BOLD else Typeface.NORMAL)
      }, weightWrap(1f))
      addView(TextView(this@MainActivity).apply {
        text = value
        textSize = if (strong) 16f else 14f
        gravity = Gravity.END
        setTextColor(valueColor)
        setTypeface(typeface, Typeface.BOLD)
      }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT))
    }

  private fun fieldRow(labelText: String, field: View): LinearLayout = LinearLayout(this).apply {
    (field.parent as? ViewGroup)?.removeView(field)
    orientation = LinearLayout.HORIZONTAL
    gravity = Gravity.CENTER_VERTICAL
    setPadding(0, dp(5), 0, dp(5))
    addView(TextView(this@MainActivity).apply {
      text = labelText
      textSize = 12f
      setTextColor(COLOR_MUTED)
      setTypeface(typeface, Typeface.BOLD)
    }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 0.34f))
    addView(field, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 0.66f))
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
    private val COLOR_BLUE = 0xFF2563EB.toInt()
    private val COLOR_DANGER = 0xFFC62828.toInt()
  }
}
