package com.financego.mobile

import android.app.Activity
import android.app.AlertDialog
import android.app.DatePickerDialog
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.animation.AlphaAnimation
import android.view.animation.Animation
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageButton
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
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt

class MainActivity : Activity() {
  private data class CategoryOption(val name: String, val label: String)
  private data class CategoryTreeItem(val name: String, val parentName: String, val depth: Int, val txCount: Int)
  private data class PeriodRange(val start: LocalDate, val end: LocalDate)
  private data class ExpenseSlice(val category: String, val amount: Double, val color: Int)
  private enum class PeriodMode { TO_DATE, FUTURE, FULL_MONTH }

  private lateinit var store: SessionStore
  private lateinit var api: FinanceGoApi
  private val executor = Executors.newSingleThreadExecutor()
  private val mainHandler = Handler(Looper.getMainLooper())
  private var bootstrap: JSONObject? = null
  private var selectedMonth: YearMonth = YearMonth.now()
  private var includePreviousBalance = true
  private var onlyConsolidatedTransactions = false
  private var selectedPeriodMode = PeriodMode.FULL_MONTH
  private var chartAllAccounts = true
  private val chartSelectedAccountIds = linkedSetOf<String>()
  private val collapsedCategoryNames = linkedSetOf<String>()
  private var currentBackAction: (() -> Unit)? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    store = SessionStore(this)
    store.migrateLegacyBaseUrl()
    api = FinanceGoApi(store)
    if (store.isLoggedIn()) NotificationRetryWorker.enqueue(this)
    if (store.isLoggedIn()) loadHome() else showLogin()
  }

  override fun onResume() {
    super.onResume()
    if (store.isLoggedIn()) NotificationRetryWorker.enqueue(this)
    if (store.isLoggedIn() && bootstrap != null && !isNotificationListenerEnabled()) showSetup()
  }

  @Deprecated("Deprecated in Java")
  override fun onBackPressed() {
    goBackOrMinimize()
  }

  private fun goBackOrMinimize() {
    currentBackAction?.invoke() ?: moveTaskToBack(true)
  }

  private fun showDashboardOrLoadHome() {
    bootstrap?.let { showDashboard(it) } ?: loadHome()
  }

  private fun showLogin() {
    currentBackAction = null
    val root = verticalRoot().apply {
      gravity = Gravity.CENTER
      setPadding(dp(22), dp(28), dp(22), dp(28))
      background = appBackground()
    }

    val card = surface().apply {
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dp(24), dp(28), dp(24), dp(24))
    }

    val eyebrow = chipText("controle financeiro premium")
    val logo = title("Finance GO", 38f).apply {
      gravity = Gravity.CENTER
      letterSpacing = 0.02f
    }
    val helper = muted("Organize contas, cartões, recorrências e notificações bancárias em uma experiência nativa.").apply {
      gravity = Gravity.CENTER
      textSize = 13f
      setPadding(dp(4), dp(2), dp(4), dp(12))
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
    card.addView(spacer(10))
    card.addView(logo)
    card.addView(spacer(6))
    card.addView(helper)
    card.addView(email)
    card.addView(password)
    card.addView(spacer(10))
    card.addView(button, matchWrap())
    root.addView(card, matchWrap())
    setContentView(root)
  }

  private fun loadHome() {
    currentBackAction = null
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
        showSessionRecovery(it)
      },
    )
  }

  private fun showSessionRecovery(message: String) {
    currentBackAction = null
    val root = screenRoot().apply {
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dp(20), dp(42), dp(20), dp(28))
    }

    root.addView(brandLogo())
    root.addView(spacer(16))
    root.addView(metricCard("Sessão mantida", "O Finance GO preservou seu login. Não foi possível atualizar os dados agora, mas você continuará conectado enquanto não tocar em Sair."))
    root.addView(diagnosticInfo("Detalhe técnico", message.ifBlank { "Falha temporária ao carregar dados." }, true))
    root.addView(primaryButton("TENTAR NOVAMENTE").apply {
      setOnClickListener { loadHome() }
    }, matchWrap())
    root.addView(secondaryButton("SAIR").apply {
      setOnClickListener {
        store.clear()
        showLogin()
      }
    }, matchWrap())

    setContentView(scroll(root))
  }

  private fun showSetup() {
    currentBackAction = { bootstrap?.let { showDashboard(it) } ?: moveTaskToBack(true) }
    val data = bootstrap
    val root = screenRoot()
    root.addView(appHeader("Configuração", showBack = false))
    root.addView(metricCard("Configuração inicial", "Vamos validar o que falta para capturar notificações bancárias em segundo plano."))

    val fullNameOk = store.fullName.isNotBlank()
    root.addView(infoRow("Nome completo", if (fullNameOk) store.fullName else "Pendente no Perfil"))
    root.addView(infoRow("Acesso às notificações", if (isNotificationListenerEnabled()) "Ativo" else "Pendente"))
    root.addView(infoRow("Execução em segundo plano", if (isIgnoringBatteryOptimizations()) "Liberada" else "Pode ser bloqueada pela bateria"))

    root.addView(primaryButton("PERMITIR NOTIFICAÇÕES").apply {
      setOnClickListener { startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) }
    }, matchWrap())
    root.addView(secondaryButton("LIBERAR BATERIA").apply {
      setOnClickListener { requestBatteryOptimizationExemption() }
    }, matchWrap())
    root.addView(secondaryButton("TESTAR CONFIGURAÇÃO").apply { setOnClickListener { loadHome() } }, matchWrap())
    root.addView(secondaryButton("ABRIR MESMO ASSIM").apply { setOnClickListener { showDashboard(data ?: JSONObject()) } }, matchWrap())
    setContentView(scroll(root))
  }

  private fun showSettingsPage() {
    currentBackAction = { showDashboardOrLoadHome() }
    val root = screenRoot()
    root.addView(appHeader("Configurações", showBack = true))
    root.addView(metricCard("Diagnóstico de notificações", "Verifique se o Finance GO está autorizado a capturar notificações bancárias e enviar os eventos para o sistema."))

    val permissionActive = isNotificationListenerEnabled()
    val pendingCount = NotificationOutbox(this).count()
    store.lastNotificationPendingCount = pendingCount
    val permissionBox = surface().apply {
      addView(settingsSectionTitle("Estado do monitoramento"))
      addView(settingsStatusRow("Permissão ativa", if (permissionActive) "Sim" else "Não", if (permissionActive) COLOR_GREEN else COLOR_DANGER, true))
      addView(settingsStatusRow("Listener de notificações", store.notificationListenerStatus.ifBlank { "Aguardando conexão do Android" }))
      addView(settingsStatusRow("Última conexão", store.notificationListenerConnectedAt.ifBlank { "Ainda não registrada" }))
      addView(settingsStatusRow("Última desconexão", store.notificationListenerDisconnectedAt.ifBlank { "Nenhuma desconexão registrada" }))
      addView(settingsStatusRow("Execução sem restrição de bateria", if (isIgnoringBatteryOptimizations()) "Sim" else "Não", if (isIgnoringBatteryOptimizations()) COLOR_GREEN else COLOR_DANGER, true))
      addView(settingsStatusRow("Usuário logado", if (store.isLoggedIn()) "Sim" else "Não"))
      addView(settingsStatusRow("Nome completo", store.fullName.ifBlank { "Pendente" }, if (store.fullName.isBlank()) COLOR_DANGER else COLOR_TEXT))
    }
    root.addView(permissionBox)

    val eventsBox = surface().apply {
      addView(settingsSectionTitle("Eventos e reenvio automático"))
      addView(diagnosticInfo("Último evento capturado", diagnosticValue(store.lastNotificationCapturedAt, store.lastNotificationCapturedSummary, "Nenhum evento financeiro capturado ainda.")))
      addView(diagnosticInfo("Último envio", diagnosticValue(store.lastNotificationSendAt, store.lastNotificationSendStatus, "Nenhum envio realizado ainda.")))
      addView(diagnosticInfo("Pendências locais", "$pendingCount notificação(ões) aguardando reenvio."))
      addView(diagnosticInfo("Última tentativa de reenvio", store.lastNotificationRetryAt.ifBlank { "Nenhuma tentativa registrada." }))
      addView(diagnosticInfo("Último erro", store.lastNotificationError.ifBlank { "Nenhum erro registrado." }, store.lastNotificationError.isNotBlank()))
    }
    root.addView(eventsBox)

    root.addView(settingsSectionTitle("Ações rápidas"))
    root.addView(primaryButton("ABRIR PERMISSÕES DE NOTIFICAÇÃO").apply {
      setOnClickListener { startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) }
    }, matchWrap())
    root.addView(secondaryButton("LIBERAR EXECUÇÃO EM SEGUNDO PLANO").apply {
      setOnClickListener { requestBatteryOptimizationExemption() }
    }, matchWrap())
    root.addView(secondaryButton("REENVIAR PENDÊNCIAS AGORA").apply {
      setOnClickListener {
        NotificationRetryWorker.enqueue(this@MainActivity)
        toast("Reenvio agendado. O Android executará assim que houver rede disponível.")
        showSettingsPage()
      }
    }, matchWrap())
    root.addView(secondaryButton("ATUALIZAR DIAGNÓSTICO").apply {
      setOnClickListener { showSettingsPage() }
    }, matchWrap())
    root.addView(secondaryButton("VOLTAR PARA TRANSAÇÕES").apply {
      setOnClickListener { bootstrap?.let { showDashboard(it) } ?: loadHome() }
    }, matchWrap())
    setContentView(scroll(root))
  }

  private fun showDashboard(data: JSONObject) {
    currentBackAction = null
    bootstrap = data
    val root = screenRoot()
    root.addView(appHeader("Transações", showProfile = true, showCharts = true))
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
    setContentViewWithFab(root, monthSwipe = { showDashboard(data) })
  }

  private fun showChartsPage(data: JSONObject = bootstrap ?: JSONObject()) {
    currentBackAction = { showDashboardOrLoadHome() }
    bootstrap = data
    val root = screenRoot()
    root.addView(appHeader("Gráficos", showBack = true))
    root.addView(periodSelector { showChartsPage(data) })
    root.addView(monthSelector { showChartsPage(data) })
    addChartAccountSelector(root, data)

    val rows = chartTransactions(data)
    val slices = expenseSlices(rows)
    val totalExpense = slices.sumOf { it.amount }
    val income = rows.filter { it.optString("type") == "credit" }.sumOf { abs(transactionAmount(it)) }
    val futureExpense = rows
      .filter { it.optString("type") == "debit" && !isConsolidated(it) }
      .sumOf { abs(transactionAmount(it)) }

    val summary = surface().apply {
      addView(summaryLine("Gastos analisados", money(totalExpense), COLOR_DANGER, true))
      addView(summaryLine("Entradas no período", money(income), COLOR_GREEN))
      addView(summaryLine("Gastos não consolidados", money(futureExpense), COLOR_BLUE))
      val top = slices.maxByOrNull { it.amount }
      addView(summaryLine("Maior categoria", top?.let { "${it.category} (${percent(it.amount, totalExpense)})" } ?: "Sem gastos"))
    }
    root.addView(summary)

    if (slices.isEmpty()) {
      root.addView(emptyState("Nenhuma despesa encontrada para o filtro selecionado."))
    } else {
      val chartBox = surface().apply {
        gravity = Gravity.CENTER_HORIZONTAL
        addView(title("Gastos por categoria", 17f))
        addView(muted("Toque em uma fatia para ver o valor exato."))
        addView(PieChartView(slices), LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(280)).apply {
          setMargins(0, dp(8), 0, dp(10))
        })
      }
      root.addView(chartBox)

      val list = surface().apply {
        addView(title("Detalhamento por categoria", 16f))
        for (slice in slices) {
          addView(summaryLine("${slice.category} (${percent(slice.amount, totalExpense)})", money(slice.amount), slice.color))
        }
      }
      root.addView(list)
    }

    setContentView(scroll(root, monthSwipe = { showChartsPage(data) }))
  }

  private fun showBanksPage(data: JSONObject = bootstrap ?: JSONObject()) {
    currentBackAction = { showDashboardOrLoadHome() }
    bootstrap = data
    val root = screenRoot()
    root.addView(appHeader("Bancos", showBack = true))
    root.addView(primaryButton("Novo banco").apply { setOnClickListener { openBankDialog(null) } }, matchWrap())

    val banks = banksList(data)
    if (banks.isEmpty()) {
      root.addView(emptyState("Nenhum banco cadastrado."))
    } else {
      for (bank in banks) root.addView(bankCard(data, bank))
    }

    setContentView(scroll(root))
  }

  private fun showCategoriesPage(data: JSONObject = bootstrap ?: JSONObject()) {
    currentBackAction = { showDashboardOrLoadHome() }
    bootstrap = data
    val root = screenRoot()
    root.addView(appHeader("Categorias", showBack = true))

    val toolbar = surface().apply {
      addView(title("Árvore de categorias", 17f))
      addView(muted("Organize suas categorias em uma hierarquia simples. Use Sub para criar uma categoria filha."))
      val actions = LinearLayout(this@MainActivity).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
      }
      actions.addView(primaryButton("Nova").apply { setOnClickListener { openCategoryDialog("create") } }, fixed(dp(88), dp(42)))
      actions.addView(secondaryButton("Expandir").apply {
        textSize = 11f
        setOnClickListener {
          collapsedCategoryNames.clear()
          showCategoriesPage(data)
        }
      }, fixed(dp(92), dp(42)))
      actions.addView(secondaryButton("Recolher").apply {
        textSize = 11f
        setOnClickListener {
          collapsedCategoryNames.clear()
          categoryTreeItems(data).forEach { collapsedCategoryNames.add(it.name) }
          showCategoriesPage(data)
        }
      }, fixed(dp(92), dp(42)))
      addView(actions)
    }
    root.addView(toolbar)

    val treeBox = surface().apply {
      setPadding(dp(8), dp(10), dp(8), dp(10))
    }
    val items = categoryTreeItems(data)
    if (items.isEmpty()) {
      treeBox.addView(emptyState("Nenhuma categoria cadastrada. Crie a primeira categoria para iniciar sua árvore."))
    } else {
      treeBox.addView(rootCategoryRow())
      val children = categoryChildrenMap(items)
      for (child in children[ROOT_CATEGORY_NAME].orEmpty()) {
        addCategoryNode(treeBox, data, child, children, 0)
      }
    }
    root.addView(treeBox)

    setContentView(scroll(root))
  }

  private fun showAccountPage(account: JSONObject) {
    currentBackAction = { showDashboardOrLoadHome() }
    val data = bootstrap ?: JSONObject()
    val root = screenRoot()
    root.addView(appHeader(accountTitle(account), showBack = true, showProfile = true, editAccount = account))
    root.addView(periodSelector { showAccountPage(account) })
    root.addView(monthSelector { showAccountPage(account) })

    val rows = monthTransactions(data, account.optString("id"))
    val initial = previousBalance(data, account.optString("id"))
    addAccountSummary(root, initial, rows)
    root.addView(section("Transações da conta"))
    addTransactionRows(root, rows)
    setContentViewWithFab(root, account.optString("id"), monthSwipe = { showAccountPage(account) })
  }

  private fun showProfilePage() {
    currentBackAction = { showDashboardOrLoadHome() }
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
    addView(CheckBox(this@MainActivity).apply {
      text = "Somente Transações Consolidadas"
      textSize = 12f
      setTextColor(COLOR_TEXT)
      isChecked = onlyConsolidatedTransactions
      setOnCheckedChangeListener { _, checked -> onlyConsolidatedTransactions = checked; onChange() }
    })
  }

  private fun monthButton(): Button = secondaryButton(monthLabel(selectedMonth)).apply {
    textSize = 13f
    setTextColor(COLOR_PRIMARY_DARK)
    setTypeface(typeface, Typeface.BOLD)
    background = gradientRounded(COLOR_MONTH_BG, 0xFFFFFFFF.toInt(), dp(2), COLOR_MONTH_BORDER, dp(16))
    setPadding(dp(12), 0, dp(12), 0)
  }

  private fun addChartAccountSelector(root: LinearLayout, data: JSONObject) {
    val accounts = accountsList(data)
    val box = surface().apply {
      addView(title("Contas analisadas", 16f))
      addView(muted("Selecione todas as contas ou escolha contas específicas para filtrar os gráficos."))
    }

    if (accounts.isEmpty()) {
      box.addView(emptyState("Nenhuma conta cadastrada para análise."))
      root.addView(box)
      return
    }

    val all = CheckBox(this).apply {
      text = "Todas as contas"
      textSize = 13f
      setTextColor(COLOR_TEXT)
      setTypeface(typeface, Typeface.BOLD)
      isChecked = chartAllAccounts || chartSelectedAccountIds.isEmpty()
      setOnCheckedChangeListener { _, checked ->
        if (checked) {
          chartAllAccounts = true
          chartSelectedAccountIds.clear()
          showChartsPage(data)
        }
      }
    }
    box.addView(all)

    for (account in accounts) {
      val accountId = account.optString("id")
      box.addView(CheckBox(this).apply {
        text = accountTitle(account)
        textSize = 12f
        setTextColor(COLOR_TEXT)
        isChecked = !chartAllAccounts && chartSelectedAccountIds.contains(accountId)
        setOnCheckedChangeListener { _, checked ->
          chartAllAccounts = false
          if (checked) chartSelectedAccountIds.add(accountId) else chartSelectedAccountIds.remove(accountId)
          if (chartSelectedAccountIds.isEmpty()) chartAllAccounts = true
          showChartsPage(data)
        }
      })
    }

    root.addView(box)
  }

  private fun chartTransactions(data: JSONObject): List<JSONObject> {
    val accountIds = if (chartAllAccounts || chartSelectedAccountIds.isEmpty()) {
      accountsList(data).map { it.optString("id") }.toSet()
    } else {
      chartSelectedAccountIds.toSet()
    }
    val range = periodRange()
    return filteredTransactions(data).filter { tx ->
      val date = txDate(tx) ?: return@filter false
      accountIds.contains(tx.optString("account_id")) && !date.isBefore(range.start) && !date.isAfter(range.end)
    }
  }

  private fun expenseSlices(rows: List<JSONObject>): List<ExpenseSlice> {
    val grouped = linkedMapOf<String, Double>()
    rows.filter { it.optString("type") == "debit" }.forEach { tx ->
      val category = tx.optString("app_category", "Outros").ifBlank { "Outros" }
      grouped[category] = (grouped[category] ?: 0.0) + abs(transactionAmount(tx))
    }
    return grouped.entries
      .filter { it.value > 0.0 }
      .sortedByDescending { it.value }
      .mapIndexed { index, entry -> ExpenseSlice(entry.key, entry.value, pieColor(index)) }
  }

  private fun pieColor(index: Int): Int {
    val colors = intArrayOf(
      0xFFE54B4B.toInt(),
      0xFFF2C94C.toInt(),
      0xFF0E8F83.toInt(),
      0xFF6C2BD9.toInt(),
      0xFF2F80ED.toInt(),
      0xFFF97316.toInt(),
      0xFF16A34A.toInt(),
      0xFFBE185D.toInt(),
      0xFF64748B.toInt(),
    )
    return colors[index % colors.size]
  }

  private fun percent(value: Double, total: Double): String =
    if (total <= 0.0) "0%" else String.format(Locale("pt", "BR"), "%.1f%%", value / total * 100.0)

  private fun rootCategoryRow(): View {
    val box = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(dp(8), dp(8), dp(6), dp(8))
      background = rounded(0xFFF8FAF4.toInt(), dp(1), 0xFFDDE8CF.toInt(), dp(12))
    }
    box.addView(TextView(this).apply {
      text = ROOT_CATEGORY_NAME
      textSize = 14f
      setTextColor(COLOR_TEXT)
      setTypeface(typeface, Typeface.BOLD)
    }, weightWrap(1f))
    box.addView(compactActionButton("Nova", true).apply {
      setOnClickListener { openCategoryDialog("create", parentName = ROOT_CATEGORY_NAME) }
    }, fixed(dp(68), dp(36)))
    return box
  }

  private fun addCategoryNode(container: LinearLayout, data: JSONObject, item: CategoryTreeItem, children: Map<String, List<CategoryTreeItem>>, depth: Int) {
    container.addView(categoryNodeRow(data, item, children[item.name].orEmpty().isNotEmpty(), depth))
    if (!collapsedCategoryNames.contains(item.name)) {
      for (child in children[item.name].orEmpty()) {
        addCategoryNode(container, data, child, children, depth + 1)
      }
    }
  }

  private fun categoryNodeRow(data: JSONObject, item: CategoryTreeItem, hasChildren: Boolean, depth: Int): View {
    val isCollapsed = collapsedCategoryNames.contains(item.name)
    val row = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(dp(4 + depth * 14), dp(5), dp(4), dp(5))
      background = rounded(if (depth % 2 == 0) 0xFFFFFFFF.toInt() else 0xFFFAFCF7.toInt(), dp(1), 0xFFE8EEDD.toInt(), dp(10))
      layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
        setMargins(0, dp(3), 0, dp(3))
      }
    }
    row.addView(iconButton(if (!hasChildren) "·" else if (isCollapsed) "+" else "-").apply {
      textSize = 17f
      isEnabled = hasChildren
      setOnClickListener {
        if (isCollapsed) collapsedCategoryNames.remove(item.name) else collapsedCategoryNames.add(item.name)
        showCategoriesPage(data)
      }
    }, fixed(dp(34), dp(34)))
    row.addView(LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      addView(TextView(this@MainActivity).apply {
        text = item.name
        textSize = 13f
        setTextColor(COLOR_TEXT)
        setTypeface(typeface, Typeface.BOLD)
        setSingleLine(false)
      })
      addView(muted("${item.txCount} transação(ões) • Pai: ${item.parentName}"))
    }, weightWrap(1f))
    row.addView(compactActionButton("Sub", false).apply {
      setOnClickListener { openCategoryDialog("add_subcategory", item, item.name) }
    }, fixed(dp(48), dp(34)))
    row.addView(compactActionButton("Editar", false).apply {
      setOnClickListener { openCategoryDialog("edit", item, item.parentName) }
    }, fixed(dp(62), dp(34)))
    if (item.name != "Outros") {
      row.addView(compactActionButton("DEL", false).apply {
        setTextColor(COLOR_DANGER)
        background = rounded(0xFFFFF5F5.toInt(), dp(1), COLOR_DANGER, dp(10))
        setOnClickListener { confirmDeleteCategory(item) }
      }, fixed(dp(46), dp(34)))
    }
    return row
  }

  private fun openCategoryDialog(mode: String, item: CategoryTreeItem? = null, parentName: String = ROOT_CATEGORY_NAME) {
    val data = bootstrap ?: JSONObject()
    val isEdit = mode == "edit"
    val isSubcategory = mode == "add_subcategory"
    val box = verticalRoot().apply { setPadding(dp(10), 0, dp(10), 0) }
    box.addView(title(when {
      isEdit -> "Editar categoria"
      isSubcategory -> "Adicionar subcategoria"
      else -> "Nova categoria"
    }, 18f))
    box.addView(spacer(8))

    val name = input("Nome", if (isEdit) item?.name.orEmpty() else "")
    val parentOptions = categoryParentOptions(data, if (isEdit) item?.name else null)
    val selectedParent = if (isSubcategory) item?.name.orEmpty() else parentName
    val parentIndex = parentOptions.indexOfFirst { it.name == selectedParent }.takeIf { it >= 0 } ?: 0
    val parent = spinner(parentOptions.map { it.label }, parentIndex)
    box.addView(fieldRow("Nome", name))
    box.addView(fieldRow("Categoria Pai", parent))

    val actions = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      setPadding(0, dp(12), 0, 0)
    }
    val cancel = secondaryButton("Cancelar")
    val save = primaryButton("Salvar")
    actions.addView(cancel, fixed(dp(112), dp(44)))
    actions.addView(save, fixed(dp(112), dp(44)))
    box.addView(actions)

    val dialog = AlertDialog.Builder(this)
      .setView(scroll(box))
      .create()
    cancel.setOnClickListener { dialog.dismiss() }
    save.setOnClickListener {
      val cleanName = name.text.toString().trim()
      val selectedParentName = parentOptions.getOrNull(parent.selectedItemPosition)?.name ?: ROOT_CATEGORY_NAME
      if (cleanName.isBlank()) {
        toast("Informe o nome da categoria.")
        return@setOnClickListener
      }
      dialog.dismiss()
      showLoading("Carregando...")
      runAsync(
        work = {
          val payload = JSONObject()
            .put("action", if (isEdit) "edit" else "add_subcategory")
            .put("category_name", if (isEdit) item?.name.orEmpty() else selectedParentName)
            .put("new_name", cleanName)
            .put("parent_name", selectedParentName)
          api.manageCategory(payload)
          api.bootstrap()
        },
        done = { showCategoriesPage(it) },
        fail = {
          toast(it)
          bootstrap?.let { current -> showCategoriesPage(current) } ?: showLogin()
        },
      )
    }
    dialog.show()
  }

  private fun confirmDeleteCategory(item: CategoryTreeItem) {
    AlertDialog.Builder(this)
      .setTitle("Excluir categoria")
      .setMessage("Deseja excluir ${item.name}? As transações desta categoria serão movidas para Outros e as subcategorias serão movidas para Raiz.")
      .setNegativeButton("Cancelar", null)
      .setPositiveButton("Excluir") { _, _ ->
        showLoading("Carregando...")
        runAsync(
          work = {
            api.manageCategory(JSONObject().put("action", "delete").put("category_name", item.name))
            api.bootstrap()
          },
          done = { showCategoriesPage(it) },
          fail = {
            toast(it)
            bootstrap?.let { current -> showCategoriesPage(current) } ?: showLogin()
          },
        )
      }
      .show()
  }

  private fun bankCard(data: JSONObject, bank: JSONObject): View = surface().apply {
    val linkedAccounts = accountsForBank(data, bank)
    val header = LinearLayout(this@MainActivity).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    header.addView(LinearLayout(this@MainActivity).apply {
      orientation = LinearLayout.VERTICAL
      addView(title(bank.optString("name", "Banco"), 16f))
      val code = bank.optString("code", "").trim()
      if (code.isNotBlank()) addView(muted("Código: $code"))
      addView(muted("${linkedAccounts.size} conta(s) vinculada(s)"))
    }, weightWrap(1f))
    header.addView(compactActionButton("Editar", false).apply {
      setOnClickListener { openBankDialog(bank) }
    }, fixed(dp(78), dp(38)))
    header.addView(compactActionButton("DEL", false).apply {
      setTextColor(COLOR_DANGER)
      background = rounded(0xFFFFF5F5.toInt(), dp(1), COLOR_DANGER, dp(12))
      setOnClickListener { confirmDeleteBank(bank) }
    }, fixed(dp(56), dp(38)))
    addView(header)

    if (linkedAccounts.isEmpty()) {
      addView(muted("Sem contas cadastradas neste banco."))
    } else {
      for (account in linkedAccounts) {
        addView(summaryLine(account.optString("name", "Conta"), "${money(accountBalance(data, account))}  ${if (accountTypeValue(account.optString("type")) == "CREDIT_CARD") "CRÉDITO" else "CORRENTE"}"))
      }
    }
  }

  private fun openBankDialog(bank: JSONObject?) {
    val box = verticalRoot().apply { setPadding(dp(10), 0, dp(10), 0) }
    box.addView(title(if (bank == null) "Novo banco" else "Editar banco", 18f))
    box.addView(spacer(8))
    val name = input("Nome do banco", bank?.optString("name", "") ?: "")
    val code = input("Código ou sigla", bank?.optString("code", "") ?: "")
    box.addView(fieldRow("Nome", name))
    box.addView(fieldRow("Código", code))

    val actions = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      setPadding(0, dp(14), 0, dp(4))
    }
    val cancel = secondaryButton("Cancelar")
    val save = primaryButton("Salvar")
    actions.addView(cancel, fixed(dp(118), dp(46)))
    actions.addView(save, fixed(dp(118), dp(46)))
    box.addView(actions)

    val dialog = AlertDialog.Builder(this).setView(scroll(box)).create()
    cancel.setOnClickListener { dialog.dismiss() }
    save.setOnClickListener {
      val cleanName = name.text.toString().replace(Regex("\\s+"), " ").trim()
      if (cleanName.isBlank()) {
        toast("Informe o nome do banco.")
        return@setOnClickListener
      }
      val payload = JSONObject()
        .put("bank_name", cleanName)
        .put("bank_code", code.text.toString().trim())
      bank?.optString("id")?.takeIf { it.isNotBlank() }?.let { payload.put("id", it) }
      dialog.dismiss()
      showLoading("Carregando...")
      runAsync(
        work = {
          api.saveBank(payload)
          api.bootstrap()
        },
        done = { showBanksPage(it) },
        fail = {
          toast(it)
          bootstrap?.let { data -> showBanksPage(data) } ?: showLogin()
        },
      )
    }
    dialog.show()
  }

  private fun confirmDeleteBank(bank: JSONObject) {
    val data = bootstrap ?: JSONObject()
    val linked = accountsForBank(data, bank)
    if (linked.isNotEmpty()) {
      AlertDialog.Builder(this)
        .setTitle("Banco com contas")
        .setMessage("Este banco possui ${linked.size} conta(s) vinculada(s). Para proteger seus dados, remova ou mova as contas antes de excluir o banco.")
        .setPositiveButton("Entendi", null)
        .show()
      return
    }

    AlertDialog.Builder(this)
      .setTitle("Excluir banco")
      .setMessage("Deseja realmente excluir ${bank.optString("name", "este banco")}?")
      .setNegativeButton("Cancelar", null)
      .setPositiveButton("Excluir") { _, _ ->
        showLoading("Carregando...")
        runAsync(
          work = {
            api.deleteBank(bank.optString("id"))
            api.bootstrap()
          },
          done = { showBanksPage(it) },
          fail = {
            toast(it)
            bootstrap?.let { data -> showBanksPage(data) } ?: showLogin()
          },
        )
      }
      .show()
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
    textBox.addView(LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      addView(bankBadge(account.optString("institution_name", "Banco")))
      addView(typeBadge(account.optString("type"), topMargin = 0))
    })
    textBox.addView(TextView(this).apply {
      text = account.optString("name", "Conta")
      textSize = 13f
      setTextColor(COLOR_MUTED)
      setTypeface(typeface, Typeface.BOLD)
      setPadding(0, dp(6), 0, 0)
    })
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
    val consolidated = isConsolidated(tx)
    val repeated = isRepeatedTransaction(tx)
    val textStyle = if (consolidated) Typeface.NORMAL else Typeface.BOLD
    orientation = LinearLayout.HORIZONTAL
    gravity = Gravity.CENTER_VERTICAL
    setPadding(dp(12), dp(10), dp(12), dp(10))
    background = gradientRounded(
      if (repeated) 0xFFEFF6FF.toInt() else 0xFAFFFFFF.toInt(),
      0xFFF8FBF8.toInt(),
      dp(if (repeated) 2 else 1),
      if (repeated) COLOR_BLUE else 0xFFE0EAE3.toInt(),
      dp(20),
    )
    setOnClickListener { openTransactionForEdit(tx) }

    val info = LinearLayout(this@MainActivity).apply { orientation = LinearLayout.VERTICAL }
    info.addView(TextView(this@MainActivity).apply {
      val date = formatDateForInput(tx.optString("posted_at", "").take(10))
      text = "$date - ${stripRecurrenceSuffix(tx.optString("description", "Transação"))}"
      textSize = 13f
      setTextColor(COLOR_TEXT)
      setTypeface(if (consolidated) Typeface.DEFAULT else Typeface.DEFAULT_BOLD, textStyle)
      paint.isFakeBoldText = !consolidated
    })

    val tagRow = LinearLayout(this@MainActivity).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(0, dp(5), 0, dp(5))
    }
    tagRow.addView(outlineBadge(tx.optString("app_category", "Outros"), COLOR_GREEN, textStyle))
    recurrenceBadgeText(tx)?.let { tagRow.addView(outlineBadge(it, COLOR_BLUE, textStyle)) }
    info.addView(tagRow)

    val accountRow = LinearLayout(this@MainActivity).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    accountRow.addView(bankBadge(account?.optString("institution_name") ?: "Banco", textStyle))
    accountRow.addView(typeBadge(account?.optString("type") ?: "", topMargin = 0, textStyle = textStyle))
    info.addView(accountRow)

    addView(info, weightWrap(1f))
    addView(TextView(this@MainActivity).apply {
      val displayAmount = transactionAmount(tx)
      text = money(displayAmount)
      textSize = 13f
      setTypeface(typeface, textStyle)
      setTextColor(if (displayAmount < 0) COLOR_DANGER else COLOR_GREEN)
      gravity = Gravity.END
    })
  }

  private fun openTransactionForEdit(tx: JSONObject) {
    if (isRepeatedTransaction(tx) && !isConsolidated(tx)) {
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

  private fun openTransactionDialog(tx: JSONObject?, repeatScope: String = "single", preferredAccountId: String? = null) {
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
    val postedAt = dateSelector(formatDateForInput(tx?.optString("posted_at")?.take(10) ?: defaultPostedAt()))
    val description = input("Descrição", stripRecurrenceSuffix(tx?.optString("description") ?: ""))
    val originSpinner = accountSpinner(accounts, tx?.optString("account_id") ?: preferredAccountId)
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
      isChecked = tx?.let { isConsolidated(it) } ?: true
    }
    val repeatLabels = listOf("Sem repetição", "Parcelamento (mensal)", "Avançado")
    val repeatValues = listOf("none", "installment", "advanced")
    val initialRepeatMode = repeatModeForTransaction(tx)
    val rawRecurrence = tx?.optJSONObject("raw")?.optJSONObject("recurrence")
    val initialRepeatForever = rawRecurrence?.optBoolean("repeatForever", false) == true ||
      (initialRepeatMode == "advanced" && tx != null && tx.isNull("installment_total") && tx.optString("installment_group_key").isNotBlank())
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
      isChecked = initialRepeatForever
    }

    fun rebuildRepeatBox() {
      repeatBox.removeAllViews()
      val selectedRepeatMode = repeatValues[repeatSpinner.selectedItemPosition]
      val isInfiniteAdvanced = selectedRepeatMode == "advanced" && forever.isChecked
      when (selectedRepeatMode) {
        "installment" -> {
          repeatBox.addView(fieldRow("Nº parcela atual", current))
          repeatBox.addView(fieldRow("Total parcelas", total))
          repeatBox.addView(fieldRow("R$ Total", totalAmount))
        }
        "advanced" -> {
          repeatBox.addView(fieldRow("Repetir a cada", repeatEvery))
          repeatBox.addView(fieldRow("Repetir infinitamente", forever))
          repeatBox.addView(fieldRow("Nº parcela atual", current))
          if (!isInfiniteAdvanced) {
            repeatBox.addView(fieldRow("Total parcelas", total))
            repeatBox.addView(fieldRow("R$ Total", totalAmount))
          }
        }
      }
    }

    fun updateTotalAmount() {
      val amountValue = parseAmountInput(amount.text.toString())
      val selectedRepeatMode = repeatValues[repeatSpinner.selectedItemPosition]
      val isInfiniteAdvanced = selectedRepeatMode == "advanced" && forever.isChecked
      val totalParcels = if (isInfiniteAdvanced) 1 else (total.text.toString().toIntOrNull()?.coerceAtLeast(1) ?: 1)
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
    forever.setOnCheckedChangeListener { _, _ -> rebuildRepeatBox(); updateTotalAmount() }
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
      val repeatForeverValue = repeatMode == "advanced" && forever.isChecked
      val totalParcels = if (repeatForeverValue) 1 else (total.text.toString().toIntOrNull()?.coerceAtLeast(1) ?: 1)
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
        .put("repeat_forever", repeatForeverValue)
        .put("installment_current", current.text.toString().toIntOrNull() ?: 1)
        .put("installment_total", totalParcels)
        .put("installment_total_amount", abs(parseAmountInput(amount.text.toString())) * totalParcels)
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

  private fun openAccountDialog(account: JSONObject?) {
    val data = bootstrap ?: JSONObject()
    val banks = banksList(data)
    if (banks.isEmpty()) {
      toast("Cadastre um banco antes de criar uma conta.")
      return
    }

    val box = verticalRoot().apply { setPadding(dp(10), 0, dp(10), 0) }
    val isEditing = account != null
    val deleteButton = if (isEditing) {
      secondaryButton("Excluir").apply {
        textSize = 12f
        setTextColor(COLOR_DANGER)
        background = rounded(0xFFFFF5F5.toInt(), dp(1), COLOR_DANGER, dp(12))
      }
    } else null
    box.addView(LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(0, dp(4), 0, dp(12))
      addView(title(if (isEditing) "Edição de Conta" else "Adicionar Conta", 18f), weightWrap(1f))
      deleteButton?.let { addView(it, fixed(dp(96), dp(40))) }
    })

    val bankSpinner = bankSpinner(banks, account?.optString("bank_id"), account?.optString("institution_name"))
    val name = input("Nome da conta", account?.optString("name", "") ?: "")
    val typeValues = listOf("CHECKING_ACCOUNT", "CREDIT_CARD")
    val typeLabels = listOf("CONTA CORRENTE", "CARTÃO DE CRÉDITO")
    val typeIndex = typeValues.indexOf(accountTypeValue(account?.optString("type") ?: "CHECKING_ACCOUNT")).coerceAtLeast(0)
    val typeSpinner = spinner(typeLabels, typeIndex)
    val balance = input("0,00", account?.optDouble("balance", 0.0)?.toString() ?: "0,00").apply {
      inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL or InputType.TYPE_NUMBER_FLAG_SIGNED
    }

    box.addView(fieldRow("Banco", bankSpinner))
    box.addView(fieldRow("Nome", name))
    box.addView(fieldRow("Tipo", typeSpinner))
    box.addView(fieldRow("Saldo base", balance))

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

    val dialog = AlertDialog.Builder(this)
      .setView(scroll(box))
      .create()

    cancelButton.setOnClickListener { dialog.dismiss() }
    saveButton.setOnClickListener {
      val payload = JSONObject()
        .put("bank_id", bankIdAt(banks, bankSpinner.selectedItemPosition))
        .put("account_name", name.text.toString())
        .put("account_type", typeValues[typeSpinner.selectedItemPosition])
        .put("balance", parseAmountInput(balance.text.toString()))
      account?.optString("id")?.takeIf { it.isNotBlank() }?.let { payload.put("id", it) }
      dialog.dismiss()
      showLoading("Carregando...")
      runAsync(
        work = { api.saveAccount(payload) },
        done = { loadHome() },
        fail = {
          toast(it)
          if (account != null) bootstrap?.let { showAccountPage(account) } ?: showLogin()
          else bootstrap?.let { showDashboard(it) } ?: showLogin()
        },
      )
    }
    deleteButton?.setOnClickListener {
      val editingAccount = account ?: return@setOnClickListener
      AlertDialog.Builder(this)
        .setTitle("Excluir conta")
        .setMessage("Deseja realmente excluir esta conta e seus dados vinculados?")
        .setNegativeButton("Cancelar", null)
        .setPositiveButton("Excluir") { _, _ ->
          dialog.dismiss()
          showLoading("Carregando...")
          runAsync(
            work = { api.deleteAccount(editingAccount.optString("id")) },
            done = { loadHome() },
            fail = {
              toast(it)
              bootstrap?.let { showAccountPage(editingAccount) } ?: showLogin()
            },
          )
        }
        .show()
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
      .replace(Regex("""\s*-\s*recorrente\s+\d+(?:/\d+)?\s*-\s*(semanal|mensal|anual)\s*$""", RegexOption.IGNORE_CASE), "")
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
      accountBaseBalance(data, accountId) + filteredTransactions(data).filter { tx ->
        val date = txDate(tx) ?: return@filter false
        tx.optString("account_id") == accountId && date.isBefore(range.start)
      }.sumOf { transactionAmount(it) }
    } else {
      0.0
    }
    val periodNet = filteredTransactions(data).filter { tx ->
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

  private fun banksList(data: JSONObject): List<JSONObject> {
    val items = mutableListOf<JSONObject>()
    val arr = data.optJSONArray("banks") ?: JSONArray()
    for (i in 0 until arr.length()) arr.optJSONObject(i)?.let { items.add(it) }
    return items.sortedBy { it.optString("name") }
  }

  private fun allTransactions(data: JSONObject): List<JSONObject> {
    val items = mutableListOf<JSONObject>()
    val arr = data.optJSONArray("transactions") ?: JSONArray()
    for (i in 0 until arr.length()) arr.optJSONObject(i)?.let { items.add(it) }
    return items
  }

  private fun filteredTransactions(data: JSONObject): List<JSONObject> =
    allTransactions(data).filter { !onlyConsolidatedTransactions || isConsolidated(it) }

  private fun monthTransactions(data: JSONObject, accountId: String?): List<JSONObject> {
    val range = periodRange()
    return filteredTransactions(data).filter { tx ->
      val date = txDate(tx) ?: return@filter false
      val matchesAccount = accountId.isNullOrBlank() || tx.optString("account_id") == accountId
      matchesAccount && !date.isBefore(range.start) && !date.isAfter(range.end)
    }
  }

  private fun previousBalance(data: JSONObject, accountId: String?): Double {
    val start = periodRange().start
    return accountBaseBalance(data, accountId) + filteredTransactions(data).filter { tx ->
      val date = txDate(tx) ?: return@filter false
      val matchesAccount = accountId.isNullOrBlank() || tx.optString("account_id") == accountId
      matchesAccount && date.isBefore(start)
    }.sumOf { transactionAmount(it) }
  }

  private fun accountBaseBalance(data: JSONObject, accountId: String?): Double =
    accountsList(data).filter { account ->
      accountId.isNullOrBlank() || account.optString("id") == accountId
    }.sumOf { it.optDouble("balance", 0.0) }

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

  private fun categoryTreeItems(data: JSONObject): List<CategoryTreeItem> {
    val counts = linkedMapOf<String, Int>()
    for (tx in allTransactions(data)) {
      val category = tx.optString("app_category", "Outros").trim().ifBlank { "Outros" }
      counts[category] = (counts[category] ?: 0) + 1
    }

    val items = mutableListOf<CategoryTreeItem>()
    val seen = linkedSetOf<String>()
    val arr = data.optJSONArray("categories") ?: JSONArray()
    for (i in 0 until arr.length()) {
      val item = arr.optJSONObject(i) ?: continue
      val name = item.optString("name").trim()
      if (name.isBlank() || name == ROOT_CATEGORY_NAME || !seen.add(name)) continue
      val parentName = item.optString("parent_name", ROOT_CATEGORY_NAME).trim().ifBlank { ROOT_CATEGORY_NAME }
      items.add(CategoryTreeItem(name, parentName, item.optInt("depth", 0).coerceAtLeast(0), counts[name] ?: 0))
    }
    for ((name, count) in counts) {
      if (name != ROOT_CATEGORY_NAME && seen.add(name)) {
        items.add(CategoryTreeItem(name, ROOT_CATEGORY_NAME, 0, count))
      }
    }
    return items.sortedWith(compareBy<CategoryTreeItem>({ it.depth }, { it.name.lowercase(Locale("pt", "BR")) }))
  }

  private fun categoryChildrenMap(items: List<CategoryTreeItem>): Map<String, List<CategoryTreeItem>> {
    val names = items.map { it.name }.toSet() + ROOT_CATEGORY_NAME
    val map = linkedMapOf<String, MutableList<CategoryTreeItem>>()
    for (item in items) {
      val parent = item.parentName.takeIf { names.contains(it) && it != item.name } ?: ROOT_CATEGORY_NAME
      map.getOrPut(parent) { mutableListOf() }.add(item)
    }
    return map.mapValues { entry ->
      entry.value.sortedWith(compareBy<CategoryTreeItem>({ it.name.lowercase(Locale("pt", "BR")) }))
    }
  }

  private fun categoryParentOptions(data: JSONObject, excludedName: String? = null): List<CategoryOption> {
    val items = categoryTreeItems(data)
    val excluded = linkedSetOf<String>()
    val cleanExcluded = excludedName?.trim().orEmpty()
    if (cleanExcluded.isNotBlank()) {
      excluded.add(cleanExcluded)
      excluded.addAll(categoryDescendants(items, cleanExcluded))
    }

    val options = mutableListOf(CategoryOption(ROOT_CATEGORY_NAME, ROOT_CATEGORY_NAME))
    for (item in items) {
      if (excluded.contains(item.name)) continue
      val prefix = "    ".repeat(item.depth.coerceAtLeast(0))
      options.add(CategoryOption(item.name, "$prefix${item.name}"))
    }
    return options
  }

  private fun categoryDescendants(items: List<CategoryTreeItem>, categoryName: String): Set<String> {
    val children = categoryChildrenMap(items)
    val result = linkedSetOf<String>()
    fun walk(parent: String) {
      for (child in children[parent].orEmpty()) {
        if (result.add(child.name)) walk(child.name)
      }
    }
    walk(categoryName)
    return result
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

  private fun isConsolidated(tx: JSONObject): Boolean {
    val explicit = jsonBoolean(tx, "is_consolidated") ?: jsonBoolean(tx, "consolidated")
    if (explicit == false) return false
    val status = tx.optString("status", "").lowercase()
    if (status == "planned" || status == "pending" || status == "nao_consolidada" || status == "não_consolidada") return false
    return explicit ?: true
  }

  private fun jsonBoolean(obj: JSONObject, key: String): Boolean? {
    if (!obj.has(key) || obj.isNull(key)) return null
    val raw = obj.opt(key)
    return when (raw) {
      is Boolean -> raw
      is Number -> raw.toInt() != 0
      is String -> when (raw.trim().lowercase()) {
        "true", "1", "yes", "sim", "consolidada", "posted" -> true
        "false", "0", "no", "nao", "não", "nao_consolidada", "não_consolidada", "planned", "pending" -> false
        else -> null
      }
      else -> null
    }
  }

  private fun dateSelector(value: String): EditText =
    input("DD/MM/AAAA", value).apply {
      inputType = InputType.TYPE_NULL
      isFocusable = false
      isClickable = true
      setCompoundDrawablesWithIntrinsicBounds(0, 0, android.R.drawable.ic_menu_my_calendar, 0)
      compoundDrawablePadding = dp(8)
      setOnClickListener { showDatePicker(this) }
    }

  private fun showDatePicker(target: EditText) {
    val initial = parseDateInput(target.text.toString()).let {
      try {
        LocalDate.parse(it)
      } catch (_: Exception) {
        LocalDate.now()
      }
    }
    DatePickerDialog(
      this,
      { _, year, monthIndex, day ->
        target.setText(formatDateForInput(LocalDate.of(year, monthIndex + 1, day).toString()))
      },
      initial.year,
      initial.monthValue - 1,
      initial.dayOfMonth,
    ).show()
  }

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

  private fun bankSpinner(banks: List<JSONObject>, selectedId: String?, selectedName: String?): Spinner {
    val labels = banks.map { it.optString("name", "Banco") }
    val selectedIndex = banks.indexOfFirst {
      it.optString("id") == selectedId || it.optString("name").equals(selectedName, ignoreCase = true)
    }.coerceAtLeast(0)
    return spinner(labels, selectedIndex)
  }

  private fun bankIdAt(banks: List<JSONObject>, index: Int): String = banks.getOrNull(index.coerceAtLeast(0))?.optString("id") ?: ""

  private fun accountForTransaction(data: JSONObject, accountId: String): JSONObject? =
    accountsList(data).firstOrNull { it.optString("id") == accountId }

  private fun accountsForBank(data: JSONObject, bank: JSONObject): List<JSONObject> {
    val bankId = bank.optString("id")
    val bankName = bank.optString("name")
    return accountsList(data).filter { account ->
      account.optString("bank_id") == bankId || account.optString("institution_name").equals(bankName, ignoreCase = true)
    }
  }

  private fun accountTitle(account: JSONObject): String =
    "${account.optString("institution_name", "Banco")} - ${account.optString("name", "Conta")}".replace(Regex("\\s+"), " ").trim()

  private fun accountTypeValue(type: String): String =
    if (type.lowercase().contains("credit") || type.lowercase().contains("cart")) "CREDIT_CARD" else "CHECKING_ACCOUNT"

  private fun bankBadge(text: String, textStyle: Int = Typeface.BOLD): TextView = outlineBadge(text.ifBlank { "Banco" }, COLOR_PURPLE, textStyle)

  private fun outlineBadge(text: String, color: Int, textStyle: Int = Typeface.BOLD): TextView =
    TextView(this).apply {
      this.text = text.ifBlank { "Sem categoria" }
      textSize = 10f
      setTextColor(color)
      setTypeface(typeface, textStyle)
      setSingleLine(true)
      setPadding(dp(8), dp(2), dp(8), dp(2))
      background = rounded(0x00FFFFFF, dp(1), color, dp(9))
      layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
        setMargins(0, 0, dp(6), 0)
      }
    }

  private fun typeBadge(type: String, topMargin: Int = 4, textStyle: Int = Typeface.BOLD): TextView {
    val isCredit = type.lowercase().contains("credit") || type.lowercase().contains("cart")
    return TextView(this).apply {
      text = if (isCredit) "CRÉDITO" else "CORRENTE"
      textSize = 10f
      setTextColor(if (isCredit) COLOR_DANGER else COLOR_GREEN)
      setTypeface(typeface, textStyle)
      setPadding(dp(8), dp(2), dp(8), dp(2))
      background = rounded(0x00FFFFFF, dp(1), if (isCredit) COLOR_DANGER else COLOR_GREEN, dp(9))
      layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
        setMargins(dp(6), dp(topMargin), 0, 0)
      }
    }
  }

  private fun appHeader(text: String, showBack: Boolean = false, showProfile: Boolean = false, editAccount: JSONObject? = null, showCharts: Boolean = false): LinearLayout = LinearLayout(this).apply {
    orientation = LinearLayout.HORIZONTAL
    gravity = Gravity.CENTER_VERTICAL
    setPadding(dp(12), dp(12), dp(10), dp(12))
    background = gradientRounded(0xFFFFFFFF.toInt(), 0xFFEAFBF4.toInt(), dp(1), COLOR_BORDER, dp(24))
    layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
      setMargins(0, 0, 0, dp(10))
    }
    if (showBack) addView(iconButton("‹").apply { setOnClickListener { goBackOrMinimize() } }, fixed(dp(42), dp(42)))
    addView(LinearLayout(this@MainActivity).apply {
      orientation = LinearLayout.VERTICAL
      addView(brandLogo())
      addView(pageTitleBadge(text))
    }, weightWrap(1f))
    if (showProfile) {
      addView(iconImageButton(R.drawable.ic_more_vert, "Mais opções").apply { setOnClickListener { showHeaderMenu(editAccount) } }, fixed(dp(42), dp(42)))
      if (showCharts) {
        addView(iconImageButton(R.drawable.ic_charts, "Gráficos").apply { setOnClickListener { showChartsPage() } }, fixed(dp(42), dp(42)))
      }
      addView(iconImageButton(R.drawable.ic_logout, "Sair").apply { setOnClickListener { store.clear(); showLogin() } }, fixed(dp(42), dp(42)))
    }
  }

  private fun showHeaderMenu(editAccount: JSONObject?) {
    val labels = if (editAccount != null) {
      arrayOf("Edição de Conta", "Atualizar", "Perfil")
    } else {
      arrayOf("Configurações", "Categorias", "Bancos", "Adicionar Conta", "Atualizar", "Perfil")
    }
    AlertDialog.Builder(this)
      .setItems(labels) { dialog, which ->
        dialog.dismiss()
        when (labels[which]) {
          "Configurações" -> showSettingsPage()
          "Categorias" -> showCategoriesPage()
          "Bancos" -> showBanksPage()
          "Adicionar Conta" -> openAccountDialog(null)
          "Edição de Conta" -> editAccount?.let { openAccountDialog(it) }
          "Atualizar" -> loadHome()
          "Perfil" -> showProfilePage()
        }
      }
      .show()
  }

  private inner class PieChartView(private val slices: List<ExpenseSlice>) : View(this@MainActivity) {
    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = 0xFFFFFFFF.toInt()
      textAlign = Paint.Align.CENTER
      textSize = dp(12).toFloat()
      typeface = Typeface.DEFAULT_BOLD
    }
    private val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = 0xFFFFFFFF.toInt()
      style = Paint.Style.STROKE
      strokeWidth = dp(2).toFloat()
    }
    private val total = slices.sumOf { it.amount }.coerceAtLeast(0.0)

    override fun onDraw(canvas: Canvas) {
      super.onDraw(canvas)
      if (total <= 0.0) return
      val size = min(width, height).toFloat()
      val radius = size * 0.42f
      val centerX = width / 2f
      val centerY = height / 2f
      val rect = RectF(centerX - radius, centerY - radius, centerX + radius, centerY + radius)
      var cursor = 0f

      for (slice in slices) {
        val sweep = (slice.amount / total * 360.0).toFloat()
        fillPaint.color = slice.color
        canvas.drawArc(rect, -90f + cursor, sweep, true, fillPaint)
        canvas.drawArc(rect, -90f + cursor, sweep, true, borderPaint)

        if (sweep >= 24f) {
          val middle = Math.toRadians((-90f + cursor + sweep / 2f).toDouble())
          val labelRadius = radius * 0.62f
          val x = centerX + cos(middle).toFloat() * labelRadius
          val y = centerY + sin(middle).toFloat() * labelRadius + dp(4)
          canvas.drawText(percent(slice.amount, total), x, y, labelPaint)
        }
        cursor += sweep
      }
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
      if (event.action != MotionEvent.ACTION_UP || total <= 0.0) return true
      val centerX = width / 2f
      val centerY = height / 2f
      val dx = event.x - centerX
      val dy = event.y - centerY
      val radius = min(width, height) * 0.42f
      if (sqrt(dx * dx + dy * dy) > radius) return true

      var angleFromRight = Math.toDegrees(atan2(dy.toDouble(), dx.toDouble())).toFloat()
      if (angleFromRight < 0f) angleFromRight += 360f
      val angleFromTop = (angleFromRight + 90f) % 360f
      var cursor = 0f
      for (slice in slices) {
        val sweep = (slice.amount / total * 360.0).toFloat()
        if (angleFromTop >= cursor && angleFromTop <= cursor + sweep) {
          toast("${slice.category}: ${money(slice.amount)} (${percent(slice.amount, total)})")
          return true
        }
        cursor += sweep
      }
      return true
    }
  }

  private fun isNotificationListenerEnabled(): Boolean {
    val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners") ?: return false
    val me = ComponentName(this, FinanceNotificationListener::class.java).flattenToString()
    return flat.split(':').any { it.equals(me, ignoreCase = true) }
  }

  private fun isIgnoringBatteryOptimizations(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
    val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
    return powerManager.isIgnoringBatteryOptimizations(packageName)
  }

  private fun requestBatteryOptimizationExemption() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      toast("Este Android não exige liberação adicional de bateria.")
      return
    }

    if (isIgnoringBatteryOptimizations()) {
      toast("O Finance GO já está liberado para execução em segundo plano.")
      return
    }

    try {
      startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
        data = Uri.parse("package:$packageName")
      })
    } catch (_: Exception) {
      startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
    }
  }

  private fun showLoading(text: String) {
    currentBackAction = null
    val root = verticalRoot().apply {
      gravity = Gravity.CENTER
      setPadding(dp(24), dp(24), dp(24), dp(24))
      background = appBackground()
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
    background = appBackground()
  }

  private fun verticalRoot(): LinearLayout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
  private fun scroll(view: View, monthSwipe: (() -> Unit)? = null): ScrollView =
    ScrollView(this).apply {
      background = appBackground()
      if (monthSwipe != null) enableMonthSwipe(this, monthSwipe)
      addView(view)
    }

  private fun setContentViewWithFab(root: LinearLayout, preferredAccountId: String? = null, monthSwipe: (() -> Unit)? = null) {
    val frame = FrameLayout(this).apply { background = appBackground() }
    frame.addView(scroll(root, monthSwipe), FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
    val fab = primaryButton("+").apply {
      textSize = 28f
      contentDescription = "Nova transação"
      setPadding(0, 0, 0, dp(4))
      background = gradientRounded(0xFF2DD4A3.toInt(), COLOR_PRIMARY_DARK, 0, 0, dp(32))
      setOnClickListener { openTransactionDialog(null, preferredAccountId = preferredAccountId) }
    }
    frame.addView(fab, FrameLayout.LayoutParams(dp(62), dp(62)).apply {
      gravity = Gravity.BOTTOM or Gravity.END
      setMargins(0, 0, dp(18), dp(22))
    })
    setContentView(frame)
  }

  private fun enableMonthSwipe(view: View, onChange: () -> Unit) {
    var downX = 0f
    var downY = 0f
    view.setOnTouchListener { _, event ->
      when (event.action) {
        MotionEvent.ACTION_DOWN -> {
          downX = event.x
          downY = event.y
        }
        MotionEvent.ACTION_UP -> {
          val dx = event.x - downX
          val dy = event.y - downY
          val minSwipe = dp(72).toFloat()
          if (abs(dx) > minSwipe && abs(dx) > abs(dy) * 1.35f) {
            selectedMonth = if (dx > 0) selectedMonth.minusMonths(1) else selectedMonth.plusMonths(1)
            toast(monthLabel(selectedMonth))
            onChange()
          }
        }
      }
      false
    }
  }

  private fun spacer(size: Int): View = View(this).apply { layoutParams = LinearLayout.LayoutParams(1, dp(size)) }
  private fun title(text: String, size: Float): TextView = TextView(this).apply { this.text = text; textSize = size; setTextColor(COLOR_TEXT); setTypeface(typeface, Typeface.BOLD); letterSpacing = -0.02f }
  private fun section(text: String): TextView = title(text, 18f).apply { setPadding(dp(2), dp(18), 0, dp(8)) }
  private fun muted(text: String): TextView = TextView(this).apply { this.text = text; textSize = 12f; setTextColor(COLOR_MUTED); setPadding(0, dp(3), 0, dp(6)) }
  private fun pageTitleBadge(text: String): TextView = TextView(this).apply {
    this.text = text
    textSize = 14f
    setTextColor(COLOR_PAGE_BADGE)
    setTypeface(typeface, Typeface.BOLD)
    setSingleLine(false)
    setPadding(dp(10), dp(5), dp(10), dp(5))
    background = gradientRounded(COLOR_PAGE_BADGE_BG, 0xFFFFFFFF.toInt(), dp(1), COLOR_PAGE_BADGE_BORDER, dp(14))
    layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
      setMargins(0, dp(6), 0, 0)
    }
  }
  private fun label(text: String): TextView = TextView(this).apply { this.text = text; textSize = 12f; setTextColor(COLOR_MUTED); setPadding(0, dp(8), 0, dp(3)) }
  private fun input(hint: String, value: String): EditText = EditText(this).apply {
    this.hint = hint
    setText(value)
    textSize = 14f
    setSingleLine(true)
    setTextColor(COLOR_TEXT)
    setHintTextColor(COLOR_MUTED)
    setPadding(dp(14), dp(10), dp(14), dp(10))
    background = rounded(0xF8FFFFFF.toInt(), dp(1), COLOR_BORDER, dp(16))
  }

  private fun primaryButton(text: String): Button = Button(this).apply {
    this.text = text
    setTextColor(0xFFFFFFFF.toInt())
    background = gradientRounded(COLOR_PRIMARY, COLOR_PRIMARY_DARK, 0, 0, dp(16))
    setTypeface(typeface, Typeface.BOLD)
  }
  private fun secondaryButton(text: String): Button = Button(this).apply {
    this.text = text
    setTextColor(COLOR_TEXT)
    background = rounded(0xF4FFFFFF.toInt(), dp(1), COLOR_BORDER, dp(16))
    setTypeface(typeface, Typeface.BOLD)
  }
  private fun iconActionButton(symbol: String, description: String): Button = secondaryButton(symbol).apply {
    contentDescription = description
    textSize = 20f
    setPadding(0, 0, 0, dp(2))
  }
  private fun iconImageButton(drawableId: Int, description: String): ImageButton =
    ImageButton(this).apply {
      contentDescription = description
      setImageResource(drawableId)
      setColorFilter(COLOR_TEXT)
      setPadding(dp(10), dp(10), dp(10), dp(10))
      background = rounded(0xF4FFFFFF.toInt(), dp(1), COLOR_BORDER, dp(16))
    }
  private fun compactActionButton(text: String, primary: Boolean): Button =
    (if (primary) primaryButton(text) else secondaryButton(text)).apply { textSize = 10f; setSingleLine(true); setPadding(0, 0, 0, 0) }
  private fun iconButton(text: String): Button = secondaryButton(text).apply { textSize = 22f; setPadding(0, 0, 0, dp(2)) }
  private fun chipText(text: String): TextView = TextView(this).apply { this.text = text.uppercase(); textSize = 11f; letterSpacing = 0.12f; setTextColor(COLOR_PRIMARY); setTypeface(typeface, Typeface.BOLD); gravity = Gravity.CENTER }

  private fun brandLogo(): LinearLayout = LinearLayout(this).apply {
    orientation = LinearLayout.HORIZONTAL
    gravity = Gravity.CENTER_VERTICAL
    addView(TextView(this@MainActivity).apply {
      text = "Finance"
      textSize = 22f
      letterSpacing = -0.03f
      setTextColor(COLOR_TEXT)
      setTypeface(typeface, Typeface.BOLD)
    })
    addView(TextView(this@MainActivity).apply {
      text = " GO"
      textSize = 18f
      letterSpacing = 0.02f
      setTextColor(COLOR_PRIMARY)
      setTypeface(typeface, Typeface.BOLD)
      setPadding(dp(8), dp(3), dp(9), dp(4))
      background = gradientRounded(0xFFE8FFF5.toInt(), 0xFFFFFFFF.toInt(), dp(1), 0xFF9BE6CE.toInt(), dp(12))
    }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
      setMargins(dp(5), 0, 0, 0)
    })
  }

  private fun surface(): LinearLayout = verticalRoot().apply {
    setPadding(dp(16), dp(14), dp(16), dp(14))
    background = gradientRounded(0xFCFFFFFF.toInt(), 0xFFF3F8F6.toInt(), dp(1), COLOR_BORDER, dp(24))
    val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
    lp.setMargins(0, dp(6), 0, dp(8))
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
    background = gradientRounded(if (highlight) 0xFFE8FFF5.toInt() else 0xFCFFFFFF.toInt(), 0xFFF7FAF9.toInt(), dp(1), COLOR_BORDER, dp(22))
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
    background = rounded(0xF8FFFFFF.toInt(), dp(1), COLOR_BORDER, dp(18))
  }

  private fun diagnosticInfo(label: String, value: String, alert: Boolean = false): TextView = TextView(this).apply {
    text = "$label\n$value"
    textSize = 13f
    setTextColor(if (alert) COLOR_DANGER else COLOR_TEXT)
    setSingleLine(false)
    maxLines = 8
    setPadding(dp(14), dp(11), dp(14), dp(11))
    background = rounded(if (alert) 0xFFFFF1F3.toInt() else 0xF8FFFFFF.toInt(), dp(1), if (alert) 0xFFFDA4AF.toInt() else COLOR_BORDER, dp(18))
    layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
      setMargins(0, dp(4), 0, dp(5))
    }
  }

  private fun settingsSectionTitle(text: String): TextView = TextView(this).apply {
    this.text = text
    textSize = 13f
    setTextColor(COLOR_TEXT)
    setTypeface(typeface, Typeface.BOLD)
    letterSpacing = 0.02f
    setPadding(dp(2), dp(8), dp(2), dp(6))
  }

  private fun settingsStatusRow(label: String, value: String, valueColor: Int = COLOR_TEXT, strong: Boolean = false): LinearLayout =
    LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(14), dp(10), dp(14), dp(10))
      background = rounded(0xF8FFFFFF.toInt(), dp(1), COLOR_BORDER, dp(18))
      layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply {
        setMargins(0, dp(4), 0, dp(5))
      }
      addView(TextView(this@MainActivity).apply {
        text = label
        textSize = 11.5f
        setTextColor(COLOR_MUTED)
        setTypeface(typeface, Typeface.BOLD)
        setSingleLine(false)
      })
      addView(TextView(this@MainActivity).apply {
        text = value
        textSize = if (strong) 15f else 13f
        setTextColor(valueColor)
        setTypeface(typeface, if (strong) Typeface.BOLD else Typeface.NORMAL)
        setSingleLine(false)
        maxLines = 5
        setPadding(0, dp(3), 0, 0)
      })
    }

  private fun diagnosticValue(at: String, detail: String, empty: String): String {
    val cleanAt = at.ifBlank { "" }
    val cleanDetail = detail.ifBlank { "" }
    if (cleanAt.isBlank() && cleanDetail.isBlank()) return empty
    return listOf(cleanAt, cleanDetail).filter { it.isNotBlank() }.joinToString("\n")
  }

  private fun emptyState(text: String): TextView = muted(text).apply {
    gravity = Gravity.CENTER
    setPadding(dp(14), dp(20), dp(14), dp(20))
    background = rounded(0xF8FFFFFF.toInt(), dp(1), COLOR_BORDER, dp(18))
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

  private fun gradientRounded(startColor: Int, endColor: Int, strokeWidth: Int, strokeColor: Int, radius: Int): GradientDrawable =
    GradientDrawable(GradientDrawable.Orientation.TL_BR, intArrayOf(startColor, endColor)).apply {
      cornerRadius = radius.toFloat()
      if (strokeWidth > 0) setStroke(strokeWidth, strokeColor)
    }

  private fun appBackground(): GradientDrawable =
    GradientDrawable(GradientDrawable.Orientation.TL_BR, intArrayOf(0xFFF8FBFA.toInt(), COLOR_BG, 0xFFE8F0FF.toInt()))

  private fun matchWrap(): LinearLayout.LayoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
  private fun weightWrap(weight: Float): LinearLayout.LayoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, weight).apply { setMargins(dp(3), dp(3), dp(3), dp(3)) }
  private fun fixed(width: Int, height: Int): LinearLayout.LayoutParams = LinearLayout.LayoutParams(width, height).apply { setMargins(dp(3), dp(3), dp(3), dp(3)) }
  private fun money(value: Double): String = NumberFormat.getCurrencyInstance(Locale("pt", "BR")).format(value)
  private fun monthLabel(month: YearMonth): String = "${month.month.getDisplayName(TextStyle.FULL, Locale("pt", "BR")).replaceFirstChar { it.titlecase(Locale("pt", "BR")) }}/${month.year}"
  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
  private fun toast(text: String) = Toast.makeText(this, text, Toast.LENGTH_LONG).show()

  companion object {
    private const val ROOT_CATEGORY_NAME = "Raiz"
    private val COLOR_BG = 0xFFEAF3F0.toInt()
    private val COLOR_TEXT = 0xFF0F172A.toInt()
    private val COLOR_MUTED = 0xFF64748B.toInt()
    private val COLOR_PRIMARY = 0xFF0FA67A.toInt()
    private val COLOR_PRIMARY_DARK = 0xFF075B4D.toInt()
    private val COLOR_MONTH_BG = 0xFFE0FFF2.toInt()
    private val COLOR_MONTH_BORDER = 0xFF62D6B1.toInt()
    private val COLOR_BORDER = 0xFFD7E4DF.toInt()
    private val COLOR_GREEN = 0xFF0E9F6E.toInt()
    private val COLOR_BLUE = 0xFF2563EB.toInt()
    private val COLOR_PURPLE = 0xFF6D28D9.toInt()
    private val COLOR_PAGE_BADGE = 0xFF7C2D12.toInt()
    private val COLOR_PAGE_BADGE_BG = 0xFFFFF7ED.toInt()
    private val COLOR_PAGE_BADGE_BORDER = 0xFFFDBA74.toInt()
    private val COLOR_DANGER = 0xFFE11D48.toInt()
  }
}
