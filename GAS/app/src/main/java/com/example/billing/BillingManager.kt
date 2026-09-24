package com.aiagentid7.payrollemployee.billing

import android.app.Activity
import android.content.Context
import android.util.Log
import com.android.billingclient.api.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class BillingManager(private val context: Context) : PurchasesUpdatedListener {

    private lateinit var billingClient: BillingClient
    private val coroutineScope = CoroutineScope(Dispatchers.IO)

    private val _isPro = MutableStateFlow(false)
    val isPro: StateFlow<Boolean> = _isPro.asStateFlow()

    private val _proProductDetails = MutableStateFlow<ProductDetails?>(null)
    val proProductDetails: StateFlow<ProductDetails?> = _proProductDetails.asStateFlow()

    companion object {
        const val PRO_PRODUCT_ID = "gas_pro"
        private const val TAG = "BillingManager"
    }

    init {
        val pendingPurchasesParams = PendingPurchasesParams.newBuilder()
            .enableOneTimeProducts()
            .enablePrepaidPlans()
            .build()
        billingClient = BillingClient.newBuilder(context)
            .setListener(this)
            .enablePendingPurchases(pendingPurchasesParams)
            .build()
        startConnection()
    }

    private fun startConnection() {
        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    Log.d(TAG, "Billing setup successful")
                    queryPurchases()
                    queryProductDetails()
                } else {
                    Log.i(TAG, "Billing setup status: ${billingResult.debugMessage} (Normal behavior on emulator/devices without Google Play Store)")
                }
            }

            override fun onBillingServiceDisconnected() {
                Log.d(TAG, "Billing service disconnected. App will rely on cached state or try later.")
            }
        })
    }

    private fun queryProductDetails() {
        val queryProductDetailsParams = QueryProductDetailsParams.newBuilder()
            .setProductList(
                listOf(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(PRO_PRODUCT_ID)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build()
                )
            )
            .build()

        billingClient.queryProductDetailsAsync(queryProductDetailsParams) { billingResult, queryProductDetailsResult ->
            val productDetailsList = queryProductDetailsResult.productDetailsList
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && !productDetailsList.isNullOrEmpty()) {
                _proProductDetails.value = productDetailsList[0]
            }
        }
    }

    fun queryPurchases() {
        if (!billingClient.isReady) {
            Log.e(TAG, "queryPurchases: BillingClient is not ready")
            return
        }
        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS)
            .build()

        billingClient.queryPurchasesAsync(params) { billingResult, purchases ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                processPurchases(purchases)
            }
        }
    }

    fun launchBillingFlow(activity: Activity) {
        val productDetails = _proProductDetails.value
        if (productDetails != null) {
            val offerToken = productDetails.subscriptionOfferDetails?.firstOrNull()?.offerToken
            
            if (offerToken == null) {
                Log.e(TAG, "Cannot launch billing flow: offer token not found.")
                return
            }
            
            val billingFlowParams = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(
                    listOf(
                        BillingFlowParams.ProductDetailsParams.newBuilder()
                            .setProductDetails(productDetails)
                            .setOfferToken(offerToken)
                            .build()
                    )
                )
                .build()
            billingClient.launchBillingFlow(activity, billingFlowParams)
        } else {
            Log.e(TAG, "Cannot launch billing flow: product details not loaded.")
        }
    }

    override fun onPurchasesUpdated(billingResult: BillingResult, purchases: MutableList<Purchase>?) {
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            processPurchases(purchases)
        } else if (billingResult.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            Log.i(TAG, "User canceled purchase flow.")
        } else {
            Log.e(TAG, "Error during purchase flow: ${billingResult.debugMessage}")
        }
    }

    private fun processPurchases(purchases: List<Purchase>) {
        var isPurchased = false
        for (purchase in purchases) {
            if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
                if (purchase.products.contains(PRO_PRODUCT_ID)) {
                    isPurchased = true
                    if (!purchase.isAcknowledged) {
                        acknowledgePurchase(purchase.purchaseToken)
                    }
                }
            }
        }
        _isPro.value = isPurchased
    }

    private fun acknowledgePurchase(purchaseToken: String) {
        val acknowledgePurchaseParams = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchaseToken)
            .build()
        billingClient.acknowledgePurchase(acknowledgePurchaseParams) { billingResult ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                Log.i(TAG, "Purchase acknowledged successfully")
            }
        }
    }
}
