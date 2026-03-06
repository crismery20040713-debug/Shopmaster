// Variables globales
let products =[];
let cart = JSON.parse(localStorage.getItem('shopMasterCart')) ||[];

// Referencias del DOM
const productsContainer = document.getElementById('products-container');
const cartItemsContainer = document.getElementById('cart-items');
const cartCount = document.getElementById('cart-count');
const cartTotal = document.getElementById('cart-total');

// Iniciar aplicación
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateCartUI();
});

// 1. Consumir API y mostrar productos
async function fetchProducts() {
    try {
        const response = await fetch('https://fakestoreapi.com/products');
        products = await response.json();
        renderProducts();
    } catch (error) {
        productsContainer.innerHTML = '<h3 class="text-danger text-center">Error al cargar productos.</h3>';
    }
}

function renderProducts() {
    productsContainer.innerHTML = '';
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'col-12 col-md-6 col-lg-3';
        card.innerHTML = `
            <div class="card product-card">
                <div class="product-img-container border-bottom">
                    <img src="${product.image}" class="product-img" alt="${product.title}">
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="product-title">${product.title}</h5>
                    <h4 class="text-success mt-auto mb-3 fw-bold">$${product.price.toFixed(2)}</h4>
                    <button class="btn btn-outline-primary w-100 mt-auto" onclick="openProductModal(${product.id})">
                        <i class="fa-solid fa-eye"></i> Ver más
                    </button>
                </div>
            </div>
        `;
        productsContainer.appendChild(card);
    });
}

// 2. Lógica del Modal del Producto
function openProductModal(id) {
    const product = products.find(p => p.id === id);
    document.getElementById('modal-img').src = product.image;
    document.getElementById('modal-name').innerText = product.title;
    document.getElementById('modal-category').innerText = product.category.toUpperCase();
    document.getElementById('modal-desc').innerText = product.description;
    document.getElementById('modal-price').innerText = product.price.toFixed(2);
    
    const btnAdd = document.getElementById('btn-add-cart');
    btnAdd.onclick = () => addToCart(product);

    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
}

// 3. Lógica del Carrito
function addToCart(product) {
    const qtyInput = document.getElementById('modal-qty').value;
    const quantity = parseInt(qtyInput);
    
    const existingProduct = cart.find(item => item.id === product.id);
    if (existingProduct) {
        existingProduct.quantity += quantity;
    } else {
        cart.push({ ...product, quantity });
    }
    
    saveAndRenderCart();
    
    // Alerta Bootstrap básica
    alert(`🛒 Añadiste ${quantity}x ${product.title} al carrito.`);
    bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveAndRenderCart();
}

function changeQuantity(id, delta) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) removeFromCart(id);
        else saveAndRenderCart();
    }
}

function saveAndRenderCart() {
    localStorage.setItem('shopMasterCart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    cartItemsContainer.innerHTML = '';
    let total = 0;
    let count = 0;

    cart.forEach(item => {
        total += item.price * item.quantity;
        count += item.quantity;
        
        cartItemsContainer.innerHTML += `
            <div class="d-flex align-items-center mb-3 border-bottom pb-2">
                <img src="${item.image}" style="width: 50px; height: 50px; object-fit: contain;" class="me-2">
                <div class="flex-grow-1">
                    <h6 class="mb-0 text-truncate" style="max-width: 150px;">${item.title}</h6>
                    <small class="text-muted">$${item.price.toFixed(2)}</small>
                </div>
                <div class="d-flex align-items-center">
                    <button class="btn btn-sm btn-outline-secondary px-2 py-0" onclick="changeQuantity(${item.id}, -1)">-</button>
                    <span class="mx-2">${item.quantity}</span>
                    <button class="btn btn-sm btn-outline-secondary px-2 py-0" onclick="changeQuantity(${item.id}, 1)">+</button>
                    <button class="btn btn-sm btn-danger ms-2" onclick="removeFromCart(${item.id})"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    });

    cartCount.innerText = count;
    cartTotal.innerText = total.toFixed(2);
}

// 4. Pago y Generación de PDF Termal (Ticket)
document.getElementById('payment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if(cart.length === 0) {
        alert("El carrito está vacío.");
        return;
    }
    
    const clientName = document.getElementById('pay-name').value;
    generateReceipt(clientName);
    
    // Limpiar después del pago
    cart =[];
    saveAndRenderCart();
    bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
    alert("¡Pago exitoso! Se descargará tu ticket.");
});

function generateReceipt(clientName) {
    const { jsPDF } = window.jspdf;
    // Dimensiones ticket térmico: ancho 80mm, largo variable (ponemos 200mm de base)
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format:[80, 200] });
    
    doc.setFont("courier", "normal"); // Fuente monoespaciada
    
    let y = 10; // Posición Y inicial
    const centerX = 40; // Mitad de 80mm
    
    // Cabecera
    doc.setFontSize(14);
    doc.text("SHOPMASTER", centerX, y, { align: "center" });
    y += 5;
    doc.setFontSize(10);
    doc.text("Ticket de Compra", centerX, y, { align: "center" });
    y += 10;
    
    // Datos Generales
    doc.setFontSize(9);
    doc.text(`Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 5, y);
    y += 5;
    doc.text(`Cliente: ${clientName.substring(0,20)}`, 5, y);
    y += 5;
    doc.text("-----------------------------------", centerX, y, { align: "center" });
    y += 5;
    
    // Cabecera Productos
    doc.text("Cant  Producto          Importe", 5, y);
    y += 5;
    doc.text("-----------------------------------", centerX, y, { align: "center" });
    y += 6;
    
    // Listado de Productos
    let total = 0;
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const qtyStr = item.quantity.toString().padEnd(4);
        const nameStr = item.title.substring(0, 15).padEnd(16);
        const priceStr = "$" + itemTotal.toFixed(2).padStart(6);
        
        doc.text(`${qtyStr} ${nameStr} ${priceStr}`, 5, y);
        y += 5;
    });
    
    y += 2;
    doc.text("-----------------------------------", centerX, y, { align: "center" });
    y += 6;
    
    // Total
    doc.setFontSize(11);
    doc.setFont("courier", "bold");
    doc.text(`TOTAL: $${total.toFixed(2)}`, 75, y, { align: "right" });
    y += 10;
    
    // Despedida
    doc.setFontSize(9);
    doc.setFont("courier", "normal");
    doc.text("¡Gracias por su compra!", centerX, y, { align: "center" });
    
    // Guardar PDF
    doc.save(`Ticket_ShopMaster_${Date.now()}.pdf`);
}