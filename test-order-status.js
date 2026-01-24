// Basit test kodu - hazırla butonunun çalışıp çalışmadığını test etmek için
// Browser console'unda çalıştırabilirsiniz

const testOrderStatusUpdate = async (orderId) => {
  console.log(`🧪 Testing order status update for order: ${orderId}`)

  try {
    // Önce mevcut order'ı al
    const getResponse = await fetch(`/api/orders`)
    if (!getResponse.ok) {
      console.error("❌ Could not fetch orders")
      return
    }

    const ordersData = await getResponse.json()
    const orders = ordersData.orders || []
    const order = orders.find(o => o.id === orderId)

    if (!order) {
      console.error(`❌ Order ${orderId} not found`)
      return
    }

    console.log(`📋 Current order status:`, {
      id: order.id,
      status: order.status,
      customerName: order.customerName
    })

    // Şimdi status'u güncelle
    const patchResponse = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PREPARING" })
    })

    console.log(`📡 PATCH Response Status: ${patchResponse.status}`)

    if (patchResponse.ok) {
      const updatedData = await patchResponse.json()
      console.log(`✅ Status update successful:`, updatedData)

      // Tekrar kontrol et
      setTimeout(async () => {
        const verifyResponse = await fetch(`/api/orders?status=PREPARING`)
        const verifyData = await verifyResponse.json()
        const verifyOrders = verifyData.orders || []
        const verifyOrder = verifyOrders.find(o => o.id === orderId)

        if (verifyOrder) {
          console.log(`🔍 Verification - Order found in PREPARING tab:`, {
            id: verifyOrder.id,
            status: verifyOrder.status,
            customerName: verifyOrder.customerName
          })
          console.log(`🎯 Test Result: ${verifyOrder.status === 'PREPARING' ? 'SUCCESS ✅' : 'FAILED ❌'}`)
        } else {
          console.log(`🔍 Verification - Order NOT found in PREPARING tab`)
          console.log(`🎯 Test Result: FAILED ❌ - Order not in PREPARING status`)
        }
      }, 1000)

    } else {
      const errorData = await patchResponse.json()
      console.error(`❌ Status update failed:`, errorData)
    }

  } catch (error) {
    console.error("💥 Test failed:", error)
  }
}

// Hızlı test için tüm PENDING order'ları listele
const listPendingOrders = async () => {
  try {
    const response = await fetch(`/api/orders?status=PENDING`)
    const data = await response.json()
    const orders = data.orders || []

    console.log(`📋 PENDING Orders (${orders.length}):`)
    orders.forEach((order, index) => {
      console.log(`${index + 1}. ${order.customerName} - ID: ${order.id}`)
    })

    if (orders.length > 0) {
      console.log(`💡 Test etmek için: testOrderStatusUpdate('${orders[0].id}')`)
    }
  } catch (error) {
    console.error("❌ Failed to list orders:", error)
  }
}

// Kullanım:
// 1. Önce pending order'ları listele: listPendingOrders()
// 2. Sonra test et: testOrderStatusUpdate('order-id-here')
