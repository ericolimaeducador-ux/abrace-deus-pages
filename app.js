(function () {
  const fallbackConfig = {
    supabaseUrl: "",
    supabaseAnonKey: "",
    pixKey: "03294572689",
    merchantName: "ABRACE DEUS",
    merchantCity: "SAO PAULO",
    currency: "BRL"
  };

  const config = Object.assign({}, fallbackConfig, window.ABRACE_CONFIG || {});
  const products = [
    {
      id: "kit-abrace-deus",
      name: "Kit Abrace Deus",
      description: "Kit especial para presentear com uma mensagem de fé e cuidado.",
      price: 6990,
      icon: "✝"
    },
    {
      id: "camiseta-abrace-deus",
      name: "Camiseta Abrace Deus",
      description: "Camiseta temática com estampa discreta e acabamento confortável.",
      price: 8990,
      icon: "AD"
    },
    {
      id: "presente-devocional",
      name: "Presente Devocional",
      description: "Uma opção de lembrança cristã para datas especiais.",
      price: 4990,
      icon: "☼"
    }
  ];

  const formatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: config.currency || "BRL"
  });

  const form = document.querySelector("#checkoutForm");
  const productGrid = document.querySelector("#productGrid");
  const productSelect = document.querySelector("#productSelect");
  const totalAmount = document.querySelector("#totalAmount");
  const statusEl = document.querySelector("#formStatus");
  const paymentPanel = document.querySelector("#paymentPanel");
  const qrcodeEl = document.querySelector("#qrcode");
  const pixCodeEl = document.querySelector("#pixCode");
  const orderIdEl = document.querySelector("#orderId");
  const paymentAmountEl = document.querySelector("#paymentAmount");
  const copyPix = document.querySelector("#copyPix");

  const supabaseClient =
    config.supabaseUrl &&
    config.supabaseAnonKey &&
    window.supabase &&
    window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

  function centsToMoney(cents) {
    return formatter.format(cents / 100);
  }

  function renderProducts() {
    productGrid.innerHTML = products
      .map(
        (product) => `
          <article class="product-card">
            <div>
              <div class="product-icon">${product.icon}</div>
              <h3>${product.name}</h3>
              <p>${product.description}</p>
            </div>
            <div>
              <div class="price">${centsToMoney(product.price)}</div>
              <a class="button secondary" href="#checkout" data-product="${product.id}">Selecionar</a>
            </div>
          </article>
        `
      )
      .join("");

    productSelect.innerHTML = products
      .map((product) => `<option value="${product.id}">${product.name}</option>`)
      .join("");
  }

  function selectedProduct() {
    return products.find((product) => product.id === productSelect.value) || products[0];
  }

  function getQuantity() {
    const value = Number(new FormData(form).get("quantity"));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
  }

  function getTotalCents() {
    return selectedProduct().price * getQuantity();
  }

  function updateTotal() {
    totalAmount.textContent = centsToMoney(getTotalCents());
  }

  function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function emv(id, value) {
    const stringValue = String(value);
    return `${id}${String(stringValue.length).padStart(2, "0")}${stringValue}`;
  }

  function crc16(payload) {
    let crc = 0xffff;
    for (let i = 0; i < payload.length; i += 1) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
        crc &= 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  function makePixPayload({ amount, txid }) {
    const merchantAccount = emv("00", "br.gov.bcb.pix") + emv("01", onlyDigits(config.pixKey));
    const payloadWithoutCrc = [
      emv("00", "01"),
      emv("26", merchantAccount),
      emv("52", "0000"),
      emv("53", "986"),
      emv("54", amount.toFixed(2)),
      emv("58", "BR"),
      emv("59", String(config.merchantName).normalize("NFD").replace(/[\u0300-\u036f]/g, "").slice(0, 25)),
      emv("60", String(config.merchantCity).normalize("NFD").replace(/[\u0300-\u036f]/g, "").slice(0, 15)),
      emv("62", emv("05", txid.slice(0, 25)))
    ].join("");
    const crcPayload = `${payloadWithoutCrc}6304`;
    return `${crcPayload}${crc16(crcPayload)}`;
  }

  function makeOrderId() {
    return `AD${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  function orderFromForm(formData, orderId, pixPayload) {
    const product = selectedProduct();
    const quantity = getQuantity();
    const totalCents = product.price * quantity;
    return {
      order_id: orderId,
      product_id: product.id,
      product_name: product.name,
      quantity,
      total_cents: totalCents,
      buyer_name: String(formData.get("name")).trim(),
      buyer_email: String(formData.get("email")).trim(),
      buyer_phone: String(formData.get("phone")).trim(),
      buyer_cpf: onlyDigits(formData.get("buyerCpf")),
      shipping_address: String(formData.get("address")).trim(),
      shipping_zip_code: onlyDigits(formData.get("zipCode")),
      shipping_city: String(formData.get("city")).trim(),
      shipping_state: String(formData.get("state")).trim().toUpperCase(),
      notes: String(formData.get("notes") || "").trim(),
      pix_key: onlyDigits(config.pixKey),
      pix_payload: pixPayload,
      payment_status: "aguardando_pagamento",
      shipping_status: "aguardando_separacao"
    };
  }

  async function saveOrder(order) {
    if (!supabaseClient) {
      localStorage.setItem(`abrace_order_${order.order_id}`, JSON.stringify(order));
      return { localOnly: true };
    }

    const { error } = await supabaseClient.from("orders").insert(order);
    if (error) {
      throw error;
    }
    return { localOnly: false };
  }

  function showPayment(order) {
    paymentPanel.hidden = false;
    orderIdEl.textContent = order.order_id;
    paymentAmountEl.textContent = centsToMoney(order.total_cents);
    pixCodeEl.value = order.pix_payload;
    qrcodeEl.innerHTML = "";

    if (window.QRCode) {
      new window.QRCode(qrcodeEl, {
        text: order.pix_payload,
        width: 256,
        height: 256,
        correctLevel: window.QRCode.CorrectLevel.M
      });
    } else {
      qrcodeEl.textContent = "Biblioteca de QR Code indisponível. Use o código PIX copia e cola.";
    }

    paymentPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    statusEl.textContent = "Registrando pedido...";

    const formData = new FormData(form);
    const orderId = makeOrderId();
    const total = getTotalCents() / 100;
    const pixPayload = makePixPayload({ amount: total, txid: orderId });
    const order = orderFromForm(formData, orderId, pixPayload);

    try {
      const result = await saveOrder(order);
      statusEl.textContent = result.localOnly
        ? "Pedido gerado localmente. Configure o Supabase para salvar na nuvem."
        : "Pedido registrado. Use o PIX abaixo para concluir.";
      showPayment(order);
    } catch (error) {
      statusEl.textContent = `Não foi possível salvar no Supabase: ${error.message}`;
      showPayment(order);
    }
  }

  renderProducts();
  updateTotal();

  productGrid.addEventListener("click", (event) => {
    const link = event.target.closest("[data-product]");
    if (!link) return;
    productSelect.value = link.dataset.product;
    updateTotal();
  });

  form.addEventListener("input", updateTotal);
  form.addEventListener("submit", handleSubmit);

  copyPix.addEventListener("click", async () => {
    await navigator.clipboard.writeText(pixCodeEl.value);
    copyPix.textContent = "Código copiado";
    setTimeout(() => {
      copyPix.textContent = "Copiar código PIX";
    }, 1800);
  });
})();
