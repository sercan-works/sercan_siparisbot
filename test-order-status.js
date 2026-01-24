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

// Hazırla butonunu simüle et (frontend kodunu test et)
const simulateHazirlaButton = async (orderId) => {
  console.log(`🧪 Simulating "Hazırla" button click for order: ${orderId}`)

  try {
    // Önce order'ı kontrol et
    const getResponse = await fetch(`/api/orders?status=PENDING`)
    const data = await getResponse.json()
    const orders = data.orders || []
    const order = orders.find(o => o.id === orderId)

    if (!order) {
      console.error(`❌ Order ${orderId} not found in PENDING status`)
      return
    }

    console.log(`📋 Found order: ${order.customerName} (${order.status})`)

    // Şimdi PATCH isteği gönder (tıpkı frontend gibi)
    const patchResponse = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PREPARING" })
    })

    console.log(`📡 PATCH Response: ${patchResponse.status}`)

    if (patchResponse.ok) {
      const updatedOrder = await patchResponse.json()
      console.log(`✅ Status updated to: ${updatedOrder.order.status}`)

      // Şimdi PREPARING order'ları çek (tıpkı frontend gibi)
      await new Promise(resolve => setTimeout(resolve, 500)) // Kısa bekleme

      const preparingResponse = await fetch(`/api/orders?status=PREPARING`)
      const preparingData = await preparingResponse.json()
      const preparingOrders = preparingData.orders || []
      const movedOrder = preparingOrders.find(o => o.id === orderId)

      if (movedOrder) {
        console.log(`🎯 SUCCESS: Order moved to PREPARING tab!`)
        console.log(`📋 Order in PREPARING: ${movedOrder.customerName} (${movedOrder.status})`)
      } else {
        console.log(`❌ FAILED: Order not found in PREPARING tab`)
      }
    } else {
      const errorData = await patchResponse.json()
      console.error(`❌ PATCH failed:`, errorData)
    }

  } catch (error) {
    console.error("💥 Simulation failed:", error)
  }
}

// Kullanıcı bilgilerini kontrol et
const checkUserInfo = async () => {
  try {
    const response = await fetch('/api/profile')
    const user = await response.json()

    console.log('👤 User Info:', {
      id: user.id,
      email: user.email,
      role: user.role,
      customerType: user.customerType,
      organizationId: user.organizationId
    })

    return user
  } catch (error) {
    console.error('❌ Failed to get user info:', error)
  }
}

// Tüm order'ları listele (farklı durumlar için)
const listAllOrders = async () => {
  try {
    console.log('📋 Checking all orders...')

    const statuses = ['PENDING', 'PREPARING', 'READY', 'COMPLETED']
    let totalOrders = 0

    for (const status of statuses) {
      const response = await fetch(`/api/orders?status=${status}`)
      const data = await response.json()
      const orders = data.orders || []

      if (orders.length > 0) {
        console.log(`📋 ${status} Orders (${orders.length}):`)
        orders.forEach((order, index) => {
          console.log(`  ${index + 1}. ${order.customerName} - ID: ${order.id} (CustomerId: ${order.customerId})`)
        })
        totalOrders += orders.length
      }
    }

    console.log(`📊 Total orders visible: ${totalOrders}`)

  } catch (error) {
    console.error('❌ Failed to list orders:', error)
  }
}

// Bot assignment'larını kontrol et
const checkBotAssignments = async () => {
  try {
    const response = await fetch('/api/bots')
    const data = await response.json()
    const bots = data.bots || []

    console.log('🤖 Bot Assignments:')

    for (const bot of bots) {
      if (bot.assignments && bot.assignments.length > 0) {
        console.log(`  Bot: ${bot.name} (${bot.id})`)
        bot.assignments.forEach(assignment => {
          console.log(`    → Assigned to: ${assignment.user.name} (${assignment.user.id}) - ${assignment.user.customerType}`)
        })
      }
    }

  } catch (error) {
    console.error('❌ Failed to check bot assignments:', error)
  }
}

// Kullanım:
// 1. Kullanıcı bilgilerini kontrol et: checkUserInfo()
// 2. Tüm görünür order'ları listele: listAllOrders()
// 3. Bot assignment'larını kontrol et: checkBotAssignments()
// 4. Pending order'ları listele: listPendingOrders()
// 5. Hazırla butonunu simüle et: simulateHazirlaButton('order-id-here')
