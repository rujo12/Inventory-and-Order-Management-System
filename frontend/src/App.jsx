import React, { useEffect, useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const BRAND_NAME = 'Stockline'
const BRAND_TAGLINE = 'Inventory operations'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'products', label: 'Products' },
  { id: 'customers', label: 'Customers' },
  { id: 'orders', label: 'Orders' },
]

const PAGE_COPY = {
  dashboard: {
    title: 'Dashboard',
    description: 'Overview of inventory, customers, and order activity.',
  },
  products: {
    title: 'Products',
    description: 'Manage catalog items, pricing, and stock levels.',
  },
  customers: {
    title: 'Customers',
    description: 'Maintain customer records used for order fulfillment.',
  },
  orders: {
    title: 'Orders',
    description: 'Create orders and review fulfillment history.',
  },
}

async function parseResponseBody(res) {
  if (res.status === 204 || res.status === 205) {
    return null
  }

  const text = await res.text()
  if (!text.trim()) {
    return null
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return JSON.parse(text)
  }

  return text
}

function formatApiError(data, res) {
  if (data?.detail) {
    return Array.isArray(data.detail)
      ? data.detail.map((d) => d.msg || d).join(', ')
      : data.detail
  }
  return res.statusText || 'Request failed'
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  let data = null
  try {
    data = await parseResponseBody(res)
  } catch {
    if (!res.ok) {
      throw new Error(res.statusText || 'Request failed')
    }
    throw new Error('Invalid response from server.')
  }

  if (!res.ok) {
    throw new Error(formatApiError(data, res))
  }

  return data
}

const emptyProduct = { name: '', sku: '', price: '', stock_quantity: '', description: '' }
const emptyCustomer = { full_name: '', email: '', phone_number: '' }

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [summary, setSummary] = useState(null)
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [orders, setOrders] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [productForm, setProductForm] = useState(emptyProduct)
  const [editingProductId, setEditingProductId] = useState(null)

  const [customerForm, setCustomerForm] = useState(emptyCustomer)
  const [editingCustomerId, setEditingCustomerId] = useState(null)
  const [orderForm, setOrderForm] = useState({ customer_id: '', items: [{ product_id: '', quantity: '1' }] })

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [summaryData, productsData, customersData, ordersData] = await Promise.all([
        api('/dashboard/summary'),
        api('/products'),
        api('/customers'),
        api('/orders'),
      ])
      setSummary(summaryData)
      setProducts(productsData)
      setCustomers(customersData)
      setOrders(ordersData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  function flashSuccess(text) {
    setMessage(text)
    setError('')
    setTimeout(() => setMessage(''), 4000)
  }

  function dismissBanner() {
    setMessage('')
    setError('')
  }

  async function handleProductSubmit(e) {
    e.preventDefault()
    setError('')

    if (!productForm.name.trim() || !productForm.sku.trim()) {
      setError('Product name and SKU are required.')
      return
    }
    if (Number(productForm.price) <= 0) {
      setError('Price must be greater than zero.')
      return
    }
    if (Number(productForm.stock_quantity) < 0) {
      setError('Stock quantity cannot be negative.')
      return
    }

    try {
      const payload = {
        name: productForm.name,
        sku: productForm.sku,
        price: Number(productForm.price),
        stock_quantity: Number(productForm.stock_quantity),
        description: productForm.description || null,
      }

      if (editingProductId) {
        await api(`/products/${editingProductId}`, { method: 'PUT', body: JSON.stringify(payload) })
        flashSuccess('Product updated successfully.')
      } else {
        await api('/products', { method: 'POST', body: JSON.stringify(payload) })
        flashSuccess('Product created successfully.')
      }
      setProductForm(emptyProduct)
      setEditingProductId(null)
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteProduct(id) {
    if (!confirm('Delete this product?')) return
    try {
      await api(`/products/${id}`, { method: 'DELETE' })
      flashSuccess('Product deleted.')
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  function handleEditProduct(product) {
    setEditingProductId(product.id)
    setProductForm({
      name: product.name,
      sku: product.sku,
      price: product.price,
      stock_quantity: product.stock_quantity,
      description: product.description || '',
    })
    setTab('products')
  }

  async function handleCustomerSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      if (editingCustomerId) {
        await api(`/customers/${editingCustomerId}`, {
          method: 'PUT',
          body: JSON.stringify(customerForm),
        })
        flashSuccess('Customer updated successfully.')
      } else {
        await api('/customers', {
          method: 'POST',
          body: JSON.stringify(customerForm),
        })
        flashSuccess('Customer created successfully.')
      }
      setCustomerForm(emptyCustomer)
      setEditingCustomerId(null)
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  function handleEditCustomer(customer) {
    setEditingCustomerId(customer.id)
    setCustomerForm({
      full_name: customer.full_name,
      email: customer.email,
      phone_number: customer.phone_number,
    })
    setTab('customers')
  }

  async function handleDeleteCustomer(id) {
    if (!confirm('Delete this customer?')) return
    try {
      await api(`/customers/${id}`, { method: 'DELETE' })
      flashSuccess('Customer deleted.')
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleOrderSubmit(e) {
    e.preventDefault()
    setError('')

    if (!orderForm.customer_id) {
      setError('Please select a customer.')
      return
    }

    const items = orderForm.items
      .filter((item) => item.product_id && Number(item.quantity) > 0)
      .map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
      }))

    if (!items.length) {
      setError('Add at least one order item with a product and quantity.')
      return
    }

    const productIds = items.map((item) => item.product_id)
    if (new Set(productIds).size !== productIds.length) {
      setError('Each product can only appear once in an order.')
      return
    }

    try {
      await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: Number(orderForm.customer_id),
          items,
        }),
      })
      flashSuccess('Order created and stock updated.')
      setOrderForm({ customer_id: '', items: [{ product_id: '', quantity: '1' }] })
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  function updateOrderItem(index, field, value) {
    const next = [...orderForm.items]
    next[index] = { ...next[index], [field]: value }
    setOrderForm({ ...orderForm, items: next })
  }

  function addOrderItem() {
    setOrderForm({ ...orderForm, items: [...orderForm.items, { product_id: '', quantity: '1' }] })
  }

  function removeOrderItem(index) {
    if (orderForm.items.length === 1) return
    const next = orderForm.items.filter((_, i) => i !== index)
    setOrderForm({ ...orderForm, items: next })
  }

  async function handleDeleteOrder(id) {
    if (!confirm('Cancel this order? Stock will be restored.')) return
    try {
      await api(`/orders/${id}`, { method: 'DELETE' })
      flashSuccess('Order cancelled and stock restored.')
      await loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  const orderPreviewTotal = useMemo(() => {
    return orderForm.items.reduce((sum, item) => {
      const product = products.find((p) => String(p.id) === String(item.product_id))
      if (!product) return sum
      return sum + Number(product.price) * Number(item.quantity || 0)
    }, 0).toFixed(2)
  }, [orderForm.items, products])

  const pageCopy = PAGE_COPY[tab]

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            <div className="brand-icon" aria-hidden="true">
              <IconLayers />
            </div>
            <div>
              <p className="brand-name">{BRAND_NAME}</p>
              <p className="brand-tagline">{BRAND_TAGLINE}</p>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${tab === item.id ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              <NavIcon id={item.id} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">Operations console</div>
      </aside>

      <div className="main">
        <div className="mobile-header">
          <div className="brand-icon" aria-hidden="true">
            <IconLayers />
          </div>
          <div>
            <p className="brand-name">{BRAND_NAME}</p>
          </div>
        </div>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${tab === item.id ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <header className="topbar">
          <h1 className="topbar-title">{pageCopy.title}</h1>
          <span className="topbar-meta">{BRAND_NAME}</span>
        </header>

        <main className="content">
          {error && (
            <div className="banner banner-error" role="alert">
              <span>{error}</span>
              <button type="button" className="banner-dismiss" onClick={dismissBanner} aria-label="Dismiss">
                ×
              </button>
            </div>
          )}
          {message && !error && (
            <div className="banner banner-success" role="status">
              <span>{message}</span>
              <button type="button" className="banner-dismiss" onClick={dismissBanner} aria-label="Dismiss">
                ×
              </button>
            </div>
          )}
          {loading && !summary && (
            <div className="banner banner-loading">Loading workspace data...</div>
          )}

          {tab === 'dashboard' && (
            <DashboardView summary={summary} loading={loading} />
          )}

          {tab === 'products' && (
            <ProductsView
              products={products}
              productForm={productForm}
              setProductForm={setProductForm}
              editingProductId={editingProductId}
              setEditingProductId={setEditingProductId}
              emptyProduct={emptyProduct}
              onSubmit={handleProductSubmit}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
            />
          )}

          {tab === 'customers' && (
            <CustomersView
              customers={customers}
              customerForm={customerForm}
              setCustomerForm={setCustomerForm}
              editingCustomerId={editingCustomerId}
              setEditingCustomerId={setEditingCustomerId}
              emptyCustomer={emptyCustomer}
              onSubmit={handleCustomerSubmit}
              onEdit={handleEditCustomer}
              onDelete={handleDeleteCustomer}
            />
          )}

          {tab === 'orders' && (
            <OrdersView
              orders={orders}
              customers={customers}
              products={products}
              orderForm={orderForm}
              setOrderForm={setOrderForm}
              orderPreviewTotal={orderPreviewTotal}
              onSubmit={handleOrderSubmit}
              onAddItem={addOrderItem}
              onRemoveItem={removeOrderItem}
              onUpdateItem={updateOrderItem}
              onDelete={handleDeleteOrder}
            />
          )}
        </main>
      </div>
    </div>
  )
}

function DashboardView({ summary, loading }) {
  if (!summary && loading) {
    return (
      <div className="card">
        <EmptyState title="Loading dashboard" description="Fetching the latest metrics." />
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="card">
        <EmptyState
          title="Dashboard unavailable"
          description="Unable to load metrics. Check your connection and refresh."
        />
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <h2>Overview</h2>
        <p>Key metrics and inventory alerts at a glance.</p>
      </div>

      <div className="metrics-grid">
        <MetricCard label="Total products" value={summary.total_products} icon="products" />
        <MetricCard label="Total customers" value={summary.total_customers} icon="customers" />
        <MetricCard label="Total orders" value={summary.total_orders} icon="orders" />
        <MetricCard
          label="Low stock items"
          value={summary.low_stock_products.length}
          icon="alert"
          variant={summary.low_stock_products.length > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Low stock alerts</h3>
          <p>Products at or below the replenishment threshold.</p>
        </div>
        {summary.low_stock_products.length ? (
          <ul className="panel-list">
            {summary.low_stock_products.map((p) => (
              <li key={p.id}>
                <span className="panel-list-name">{p.name}</span>
                <span className="badge badge-warning">{p.stock_quantity} in stock</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No low-stock alerts"
            description="All products are above the replenishment threshold."
            compact
          />
        )}
      </div>
    </>
  )
}

function ProductsView({
  products,
  productForm,
  setProductForm,
  editingProductId,
  setEditingProductId,
  emptyProduct,
  onSubmit,
  onEdit,
  onDelete,
}) {
  return (
    <>
      <div className="page-header">
        <h2>Product catalog</h2>
        <p>Add and maintain items in your inventory catalog.</p>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <h3>{editingProductId ? 'Edit product' : 'New product'}</h3>
            <p>{editingProductId ? 'Update product details and stock.' : 'Add a new item to the catalog.'}</p>
          </div>
          <form className="form" onSubmit={onSubmit}>
            <div>
              <label htmlFor="product-name">Product name</label>
              <input
                id="product-name"
                placeholder="e.g. Wireless keyboard"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="product-sku">SKU</label>
              <input
                id="product-sku"
                placeholder="e.g. KB-001"
                value={productForm.sku}
                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                required
              />
            </div>
            <div className="form-row-2">
              <div>
                <label htmlFor="product-price">Unit price</label>
                <input
                  id="product-price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="product-stock">Stock quantity</label>
                <input
                  id="product-stock"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={productForm.stock_quantity}
                  onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="product-desc">Description</label>
              <textarea
                id="product-desc"
                placeholder="Optional product notes"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingProductId ? 'Save changes' : 'Add product'}
              </button>
              {editingProductId && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditingProductId(null)
                    setProductForm(emptyProduct)
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>All products</h3>
            <p>{products.length} item{products.length !== 1 ? 's' : ''} in catalog</p>
          </div>
          {products.length ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td className="cell-primary" data-label="Name">
                        {p.name}
                      </td>
                      <td data-label="SKU">
                        <span className="sku-code">{p.sku}</span>
                      </td>
                      <td data-label="Price">${Number(p.price).toFixed(2)}</td>
                      <td data-label="Stock">
                        {p.stock_quantity <= 5 ? (
                          <span className="badge badge-warning">{p.stock_quantity}</span>
                        ) : (
                          <span className="badge badge-success">{p.stock_quantity}</span>
                        )}
                      </td>
                      <td className="cell-actions" data-label="Actions">
                        <div className="btn-group">
                          <button type="button" className="btn-secondary btn-sm" onClick={() => onEdit(p)}>
                            Edit
                          </button>
                          <button type="button" className="btn-danger btn-sm" onClick={() => onDelete(p.id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No products yet"
              description="Add your first product using the form on the left."
            />
          )}
        </div>
      </div>
    </>
  )
}

function CustomersView({
  customers,
  customerForm,
  setCustomerForm,
  editingCustomerId,
  setEditingCustomerId,
  emptyCustomer,
  onSubmit,
  onEdit,
  onDelete,
}) {
  return (
    <>
      <div className="page-header">
        <h2>Customer directory</h2>
        <p>Manage customer records for order placement.</p>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <h3>{editingCustomerId ? 'Edit customer' : 'New customer'}</h3>
            <p>{editingCustomerId ? 'Update contact information.' : 'Register a new customer.'}</p>
          </div>
          <form className="form" onSubmit={onSubmit}>
            <div>
              <label htmlFor="customer-name">Full name</label>
              <input
                id="customer-name"
                placeholder="e.g. Jane Cooper"
                value={customerForm.full_name}
                onChange={(e) => setCustomerForm({ ...customerForm, full_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="customer-email">Email</label>
              <input
                id="customer-email"
                type="email"
                placeholder="jane@company.com"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="customer-phone">Phone number</label>
              <input
                id="customer-phone"
                minLength={5}
                placeholder="+1 555 000 0000"
                value={customerForm.phone_number}
                onChange={(e) => setCustomerForm({ ...customerForm, phone_number: e.target.value })}
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingCustomerId ? 'Save changes' : 'Add customer'}
              </button>
              {editingCustomerId && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditingCustomerId(null)
                    setCustomerForm(emptyCustomer)
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>All customers</h3>
            <p>{customers.length} customer{customers.length !== 1 ? 's' : ''} registered</p>
          </div>
          {customers.length ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td className="cell-primary" data-label="Name">
                        {c.full_name}
                      </td>
                      <td className="cell-muted" data-label="Email">
                        {c.email}
                      </td>
                      <td className="cell-muted" data-label="Phone">
                        {c.phone_number}
                      </td>
                      <td className="cell-actions" data-label="Actions">
                        <div className="btn-group">
                          <button type="button" className="btn-secondary btn-sm" onClick={() => onEdit(c)}>
                            Edit
                          </button>
                          <button type="button" className="btn-danger btn-sm" onClick={() => onDelete(c.id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No customers yet"
              description="Add your first customer using the form on the left."
            />
          )}
        </div>
      </div>
    </>
  )
}

function OrdersView({
  orders,
  customers,
  products,
  orderForm,
  setOrderForm,
  orderPreviewTotal,
  onSubmit,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onDelete,
}) {
  return (
    <>
      <div className="page-header">
        <h2>Order management</h2>
        <p>Place new orders and review fulfillment records.</p>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-header">
            <h3>New order</h3>
            <p>Select a customer and add line items to place an order.</p>
          </div>
          <form className="form" onSubmit={onSubmit}>
            <div>
              <label htmlFor="order-customer">Customer</label>
              <select
                id="order-customer"
                value={orderForm.customer_id}
                onChange={(e) => setOrderForm({ ...orderForm, customer_id: e.target.value })}
                required
              >
                <option value="">Select a customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="order-compose-section">
              <label>Line items</label>
              {orderForm.items.map((item, index) => {
                const selected = products.find((p) => String(p.id) === String(item.product_id))
                const lineTotal = selected
                  ? (Number(selected.price) * Number(item.quantity || 0)).toFixed(2)
                  : '0.00'
                return (
                  <div key={index} className="order-line">
                    <div className="order-line-header">
                      <span className="order-line-label">Item {index + 1}</span>
                      {orderForm.items.length > 1 && (
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          onClick={() => onRemoveItem(index)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="order-line-grid">
                      <div>
                        <label htmlFor={`order-product-${index}`}>Product</label>
                        <select
                          id={`order-product-${index}`}
                          value={item.product_id}
                          onChange={(e) => onUpdateItem(index, 'product_id', e.target.value)}
                          required
                        >
                          <option value="">Select product</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.stock_quantity} available)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`order-qty-${index}`}>Qty</label>
                        <input
                          id={`order-qty-${index}`}
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => onUpdateItem(index, 'quantity', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="order-line-footer">
                      <span>Line subtotal</span>
                      <strong>${lineTotal}</strong>
                    </div>
                  </div>
                )
              })}
            </div>

            <button type="button" className="btn-secondary" onClick={onAddItem}>
              Add line item
            </button>

            <div className="order-total-bar">
              <span className="order-total-label">Estimated total</span>
              <span className="order-total-value">${orderPreviewTotal}</span>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Place order
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Order history</h3>
            <p>{orders.length} order{orders.length !== 1 ? 's' : ''} on record</p>
          </div>
          {orders.length ? (
            <div className="order-list">
              {orders.map((order) => (
                <article key={order.id} className="order-record">
                  <div className="order-record-header">
                    <span className="order-record-id">Order #{order.id}</span>
                    <span className="order-record-total">${Number(order.total_amount).toFixed(2)}</span>
                  </div>
                  <div className="order-record-body">
                    <p className="order-record-customer">
                      <strong>{order.customer?.full_name}</strong>
                      <span> · {order.customer?.email}</span>
                    </p>
                    <table className="order-items-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Qty</th>
                          <th>Unit price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items?.map((item) => (
                          <tr key={item.id}>
                            <td>{item.product?.name}</td>
                            <td>{item.quantity}</td>
                            <td>${Number(item.unit_price).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="order-record-footer">
                    <button type="button" className="btn-danger btn-sm" onClick={() => onDelete(order.id)}>
                      Cancel order
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No orders yet"
              description="Place your first order using the form on the left."
            />
          )}
        </div>
      </div>
    </>
  )
}

function MetricCard({ label, value, icon, variant = 'default' }) {
  return (
    <div className="card metric-card">
      <div className="metric-card-top">
        <div className={`metric-icon ${variant === 'warning' ? 'warning' : ''}`}>
          <MetricIcon type={icon} />
        </div>
      </div>
      <div>
        <p className="metric-label">{label}</p>
        <p className="metric-value">{value}</p>
      </div>
    </div>
  )
}

function EmptyState({ title, description, compact = false }) {
  return (
    <div className={`empty-state ${compact ? 'empty-state-compact' : ''}`}>
      {!compact && (
        <div className="empty-state-icon" aria-hidden="true">
          <IconInbox />
        </div>
      )}
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  )
}

function NavIcon({ id }) {
  const icons = {
    dashboard: <IconGrid />,
    products: <IconBox />,
    customers: <IconUsers />,
    orders: <IconCart />,
  }
  return icons[id] || null
}

function MetricIcon({ type }) {
  const icons = {
    products: <IconBox />,
    customers: <IconUsers />,
    orders: <IconCart />,
    alert: <IconAlert />,
  }
  return icons[type] || <IconGrid />
}

function IconLayers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  )
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

function IconBox() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconCart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconInbox() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}
