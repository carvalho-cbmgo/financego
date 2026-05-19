package com.financego.companion

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.ProgressBar
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MobileWebActivity : AppCompatActivity() {
  companion object {
    const val EXTRA_URL = "financego_mobile_url"
  }

  private lateinit var webView: WebView
  private lateinit var progressBar: ProgressBar

  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_mobile_web)

    webView = findViewById(R.id.financeGoWebView)
    progressBar = findViewById(R.id.webProgressBar)

    findViewById<Button>(R.id.reloadWebButton).setOnClickListener {
      webView.reload()
    }

    findViewById<Button>(R.id.closeWebButton).setOnClickListener {
      finish()
    }

    webView.settings.apply {
      javaScriptEnabled = true
      domStorageEnabled = true
      databaseEnabled = true
      cacheMode = WebSettings.LOAD_DEFAULT
      loadsImagesAutomatically = true
      useWideViewPort = true
      loadWithOverviewMode = true
      mediaPlaybackRequiresUserGesture = false
    }

    webView.webViewClient = object : WebViewClient() {
      override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
        return false
      }
    }

    webView.webChromeClient = object : WebChromeClient() {
      override fun onProgressChanged(view: WebView?, newProgress: Int) {
        progressBar.progress = newProgress
        progressBar.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
      }
    }

    val url = resolveUrl()
    if (url.isBlank()) {
      Toast.makeText(this, "Configure a URL base antes de abrir o FinanceGO.", Toast.LENGTH_LONG).show()
      finish()
      return
    }

    webView.loadUrl(url)
  }

  @Deprecated("Deprecated in Java")
  override fun onBackPressed() {
    if (::webView.isInitialized && webView.canGoBack()) {
      webView.goBack()
      return
    }
    super.onBackPressed()
  }

  private fun resolveUrl(): String {
    val explicitUrl = intent.getStringExtra(EXTRA_URL)?.trim().orEmpty()
    if (explicitUrl.startsWith("http://") || explicitUrl.startsWith("https://")) return explicitUrl

    val config = CompanionPrefs.load(this)
    val baseUrl = config.baseUrl.trim().trimEnd('/')
    if (baseUrl.isBlank()) return ""
    return "$baseUrl/mobile"
  }
}
