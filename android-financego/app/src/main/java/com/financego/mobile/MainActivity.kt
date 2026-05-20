package com.financego.mobile

import android.app.Activity
import android.app.AlertDialog
import android.content.ComponentName
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.text.InputType
import android.graphics.Typeface
import android.view.Gravity
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject
import java.text.NumberFormat
import java.util.Locale
import java.util.concurrent.Executors

class MainActivity : Activity() {
  private lateinit var store: SessionStore
  private lateinit var api: FinanceGoApi
  private val executor = Executors.newSingleThreadExecutor()
  private val mainHandler = Handler(Looper.getMainLooper())
  private var bootstrap: JSONObject? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    store = SessionStore(this)
    api = FinanceGoApi(store)
    if (store.isLoggedIn()) loadHome() else showLogin()
  }

  override fun onResume() {
    super.onResume()
    if (store.isLoggedIn() && bootstrap != null && !isNotificationListenerEnabled()) showSetup()
  }

  private fun showLogin() {
    val root = verticalRoot()
    root.gravity = Gravity.CENTER
    root.setPadding(dp(24), dp(30), dp(24), dp(30))

    val logo = title("Finance GO", 34f)
    logo.gravity = Gravity.CENTER
    val subtitle = muted("Controle financeiro nativo, sincronizado e pronto para notificações bancárias.")
    subtitle.gravity = Gravity.CENTER

    val baseUrl = input("URL do Finance GO", store.baseUrl)
    val email = input("E-mail", store.userEmail.ifBlank { "maykocarvalho@gmail.com" })
    val password = input("Senha", "123456")
    password.inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
    val button = primaryButton("Entrar")
    val progress = ProgressBar(this).apply { visibility = View.GONE }

    button.setOnClickListener {
      store.baseUrl = baseUrl.text.toString()
      button.isEnabled = false
      progress.visibility = View.VISIBLE
      runAsync(
        work = { api.login(email.text.toString(), password.text.toString()) },
        done = {
          button.isEnabled = true
          progress.visibility = View.GONE
          loadHome()
        },
        fail = {
          button.isEnabled = true
          progress.visibility = View.GONE
          toast(it)
        },
      )
    }

    root.addView(logo)
    root.addView(subtitle)
    root.addView(spacer(18))
    root.addView(baseUrl)
    root.addView(email)
    root.addView(password)
    root.addView(button)
    root.addView(progress)
    setContentView(root)
  }

  private fun loadHome() {
    showLoading("Sincronizando dados do Finance GO...")
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
    val root = verticalRoot()
    root.setPadding(dp(22), dp(24), dp(22), dp(24))
    root.addView(title("Configuração inicial", 28f))
    root.addView(muted("Vamos validar o que falta para o Finance GO registrar notificações bancárias em segundo plano."))
    root.addView(spacer(14))

    val fullNameOk = store.fullName.isNotBlank()
    root.addView(statusLine("Nome completo", if (fullNameOk) "OK: ${store.fullName}" else "Pendente no Perfil do sistema web"))
    root.addView(statusLine("Acesso às notificações", if (isNotificationListenerEnabled()) "OK" else "Pendente"))

    val openSettings = secondaryButton("Permitir acesso às notificações")
    openSettings.setOnClickListener {
      startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
    }

    val test = primaryButton("Testar configuração")
    test.setOnClickListener { loadHome() }

    val continueButton = secondaryButton("Abrir mesmo assim")
    continueButton.setOnClickListener { showDashboard(data ?: JSONObject()) }

    root.addView(spacer(14))
    root.addView(openSettings)
    root.addView(test)
    root.addView(continueButton)
    setContentView(ScrollView(this).apply { addView(root) })
  }

  private fun showDashboard(data: JSONObject) {
    bootstrap = data
    val root = verticalRoot()
    root.setPadding(dp(18), dp(18), dp(18), dp(28))

    val profile = data.optJSONObject("profile") ?: JSONObject()
    val summary = data.optJSONObject("summary") ?: JSONObject()
    root.addView(title("Finance GO", 30f))
    root.addView(muted(profile.optString("full_name", store.userEmail)))
    root.addView(card("Saldo geral", summary.optString("balance_label", money(summary.optDouble("balance", 0.0)))))

    val actions = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER; setPadding(0, dp(8), 0, dp(8)) }
    actions.addView(primaryButton("Nova transação").apply { setOnClickListener { openTransactionDialog(null) } })
    actions.addView(secondaryButton("Atualizar").apply { setOnClickListener { loadHome() } })
    actions.addView(secondaryButton("Sair").apply { setOnClickListener { store.clear(); showLogin() } })
    root.addView(actions)

    root.addView(section("Contas"))
    val accounts = data.optJSONArray("accounts") ?: JSONArray()
    for (i in 0 until accounts.length()) {
      val account = accounts.optJSONObject(i)
      root.addView(rowCard(
        account.optString("name", "Conta"),
        "${account.optString("institution_name", "Banco")} • ${account.optString("type", "conta")}",
        money(account.optDouble("computed_balance", 0.0)),
      ))
    }

    root.addView(section("Últimas transações"))
    val transactions = data.optJSONArray("transactions") ?: JSONArray()
    for (i in 0 until transactions.length()) {
      val tx = transactions.optJSONObject(i)
      val row = rowCard(
        tx.optString("description", "Transação"),
        "${tx.optString("app_category", "Outros")} • ${tx.optString("posted_at", "").take(10)}",
        money(tx.optDouble("amount", 0.0)),
      )
      row.setOnClickListener { openTransactionDialog(tx) }
      root.addView(row)
    }

    setContentView(ScrollView(this).apply { addView(root) })
  }

  private fun openTransactionDialog(tx: JSONObject?) {
    val data = bootstrap ?: JSONObject()
    val accounts = data.optJSONArray("accounts") ?: JSONArray()
    if (accounts.length() == 0) {
      toast("Cadastre uma conta antes de criar transações.")
      return
    }

    val box = verticalRoot()
    box.setPadding(dp(8), 0, dp(8), 0)
    val description = input("Descrição", tx?.optString("description") ?: "")
    val amount = input("Valor", kotlin.math.abs(tx?.optDouble("amount", 0.0) ?: 0.0).takeIf { it > 0 }?.toString() ?: "")
    amount.inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
    val type = Spinner(this)
    val typeValues = listOf("debit", "credit", "transfer")
    type.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, listOf("Despesa", "Receita", "Transferência"))
    type.setSelection(typeValues.indexOf(tx?.optString("type") ?: "debit").coerceAtLeast(0))
    val accountSpinner = accountSpinner(accounts, tx?.optString("account_id"))
    val destinationSpinner = accountSpinner(accounts, null)
    val consolidated = CheckBox(this).apply { text = "Consolidada"; isChecked = tx?.optBoolean("is_consolidated", true) ?: true }

    box.addView(description)
    box.addView(amount)
    box.addView(label("Tipo")); box.addView(type)
    box.addView(label("Conta / origem")); box.addView(accountSpinner)
    box.addView(label("Conta de destino, se transferência")); box.addView(destinationSpinner)
    box.addView(consolidated)

    AlertDialog.Builder(this)
      .setTitle(if (tx == null) "Nova transação" else "Editar transação")
      .setView(box)
      .setNegativeButton("Cancelar", null)
      .setPositiveButton("Salvar") { _, _ ->
        val selectedType = typeValues[type.selectedItemPosition]
        val payload = JSONObject()
          .put("id", tx?.optString("id") ?: "")
          .put("description", description.text.toString())
          .put("amount", amount.text.toString().replace(',', '.').toDoubleOrNull() ?: 0.0)
          .put("type", selectedType)
          .put("account_id", accountIdAt(accounts, accountSpinner.selectedItemPosition))
          .put("destination_account_id", accountIdAt(accounts, destinationSpinner.selectedItemPosition))
          .put("category", if (selectedType == "transfer") "Transferências" else tx?.optString("app_category", "Outros") ?: "Outros")
          .put("is_consolidated", consolidated.isChecked)
        runAsync(
          work = { api.saveTransaction(payload) },
          done = { loadHome() },
          fail = { toast(it) },
        )
      }
      .show()
  }

  private fun accountSpinner(accounts: JSONArray, selectedId: String?): Spinner {
    val labels = mutableListOf<String>()
    var selectedIndex = 0
    for (i in 0 until accounts.length()) {
      val account = accounts.optJSONObject(i)
      labels.add("${account.optString("institution_name", "Banco")} - ${account.optString("name", "Conta")}")
      if (selectedId != null && account.optString("id") == selectedId) selectedIndex = i
    }
    return Spinner(this).apply {
      adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, labels)
      setSelection(selectedIndex)
    }
  }

  private fun accountIdAt(accounts: JSONArray, index: Int): String = accounts.optJSONObject(index.coerceAtLeast(0))?.optString("id") ?: ""

  private fun isNotificationListenerEnabled(): Boolean {
    val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners") ?: return false
    val me = ComponentName(this, FinanceNotificationListener::class.java).flattenToString()
    return flat.split(':').any { it.equals(me, ignoreCase = true) }
  }

  private fun showLoading(text: String) {
    val root = verticalRoot()
    root.gravity = Gravity.CENTER
    root.addView(ProgressBar(this))
    root.addView(muted(text))
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

  private fun verticalRoot(): LinearLayout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
  private fun spacer(size: Int): View = View(this).apply { layoutParams = LinearLayout.LayoutParams(1, dp(size)) }
  private fun title(text: String, size: Float): TextView = TextView(this).apply { this.text = text; textSize = size; setTextColor(0xFF172033.toInt()); setTypeface(typeface, Typeface.BOLD) }
  private fun section(text: String): TextView = title(text, 18f).apply { setPadding(0, dp(16), 0, dp(6)) }
  private fun muted(text: String): TextView = TextView(this).apply { this.text = text; textSize = 13f; setTextColor(0xFF667085.toInt()); setPadding(0, dp(4), 0, dp(8)) }
  private fun label(text: String): TextView = TextView(this).apply { this.text = text; textSize = 12f; setTextColor(0xFF475467.toInt()); setPadding(0, dp(8), 0, dp(3)) }
  private fun input(hint: String, value: String): EditText = EditText(this).apply { this.hint = hint; setText(value); textSize = 14f; setSingleLine(true) }
  private fun primaryButton(text: String): Button = Button(this).apply { this.text = text; setTextColor(0xFFFFFFFF.toInt()); setBackgroundColor(0xFF7A9B19.toInt()) }
  private fun secondaryButton(text: String): Button = Button(this).apply { this.text = text; setTextColor(0xFF263238.toInt()) }
  private fun card(label: String, value: String): TextView = title(value, 24f).apply { text = "$label\n$value"; setPadding(dp(16), dp(14), dp(16), dp(14)); setBackgroundColor(0xFFEFF5E4.toInt()) }
  private fun statusLine(label: String, value: String): TextView = muted("$label: $value")
  private fun rowCard(title: String, subtitle: String, value: String): TextView = TextView(this).apply { text = "$title\n$subtitle\n$value"; textSize = 13f; setPadding(dp(12), dp(10), dp(12), dp(10)); setBackgroundColor(0xFFFFFFFF.toInt()) }
  private fun money(value: Double): String = NumberFormat.getCurrencyInstance(Locale("pt", "BR")).format(value)
  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
  private fun toast(text: String) = Toast.makeText(this, text, Toast.LENGTH_LONG).show()
}
