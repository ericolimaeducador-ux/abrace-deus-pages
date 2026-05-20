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
      id: "abraco-essencial",
      slug: "abraco-essencial",
      name: "Abraço Essencial",
      category: "Essencial",
      description: "Kit surpresa de fé e acolhimento para lembrar que Deus continua perto.",
      longDescription: "Uma experiência simples e profunda para transformar cuidado em presença.",
      price: 6990,
      imageUrl: "https://media.base44.com/images/public/6a0cc7e610b06c3387f86eda/c608e95a9_generated_57ccfc42.png",
      cta: "Escolher Kit"
    },
    {
      id: "abraco-luto",
      slug: "abraco-luto",
      name: "Abraço para Luto",
      category: "Luto",
      description: "Um gesto de cuidado para quem está atravessando saudade e dor.",
      longDescription: "Criado para momentos em que a presença fala mais que explicações.",
      price: 8990,
      imageUrl: "https://media.base44.com/images/public/6a0cc7e610b06c3387f86eda/c608e95a9_generated_57ccfc42.png",
      cta: "Enviar este abraço"
    },
    {
      id: "doe-um-abraco",
      slug: "doe-um-abraco",
      name: "Doe um Abraço",
      category: "Doação",
      description: "Doe um kit para pessoas indicadas por instituições parceiras.",
      longDescription: "Sua generosidade ajuda a campanha a alcançar quem mais precisa.",
      price: 4990,
      imageUrl: "https://media.base44.com/images/public/6a0cc7e610b06c3387f86eda/c608e95a9_generated_57ccfc42.png",
      cta: "Doar"
    }
  ];

  const reasons = [
    "Luto",
    "Ansiedade ou angústia",
    "Enfermidade",
    "Solidão",
    "Crise familiar",
    "Separação",
    "Desânimo espiritual",
    "Outro"
  ];

  const metrics = [
    ["kits_sold", "Abraços enviados", 21],
    ["kits_donated", "Kits doados", 7],
    ["institutions_count", "Instituições parceiras", 3],
    ["cities_reached", "Cidades alcançadas", 5],
    ["people_reached", "Pessoas acolhidas", 28]
  ];

  const testimonials = [
    {
      name: "Maria",
      location: "São Paulo, SP",
      content: "Receber esse presente foi como sentir que alguém lembrou de mim no meio de um dia muito difícil."
    },
    {
      name: "Ana",
      location: "Campinas, SP",
      content: "Eu não sabia o que dizer para uma amiga em luto. O Abrace Deus me ajudou a transformar carinho em gesto."
    },
    {
      name: "Carlos",
      location: "Guarulhos, SP",
      content: "A simplicidade da experiência trouxe silêncio, oração e descanso para a minha casa."
    }
  ];

  const faqs = [
    ["A pessoa sabe o que vai receber?", "Não. A experiência foi pensada como um kit surpresa. A revelação faz parte do impacto emocional do presente."],
    ["Posso enviar de forma anônima?", "Sim. Você pode escolher se deseja assinar a mensagem ou enviar anonimamente no campo de mensagem."],
    ["O Abrace Deus é um produto terapêutico?", "Não. É um item simbólico de fé, acolhimento e conforto emocional. Não substitui acompanhamento médico, psicológico, psiquiátrico ou pastoral."],
    ["Posso enviar para outra cidade?", "Sim. O envio é feito para o endereço indicado no momento da compra."],
    ["Posso doar kits?", "Sim. Você pode doar kits para pessoas indicadas por instituições parceiras."],
    ["Igrejas e instituições podem participar?", "Sim. Instituições podem se cadastrar para indicar pessoas ou organizar campanhas de doação."],
    ["O que vem no kit?", "O kit é uma experiência surpresa de fé e acolhimento. Por isso, nem todos os detalhes são revelados antes da entrega."]
  ];

  const formatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: config.currency || "BRL"
  });

  const supabaseClient =
    config.supabaseUrl &&
    config.supabaseAnonKey &&
    window.supabase &&
    window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

  const $ = (selector) => document.querySelector(selector);

  const checkoutForm = $("#checkoutForm");
  const donationForm = $("#donationForm");
  const institutionForm = $("#institutionForm");
  const productGrid = $("#productGrid");
  const productSelect = $("#productSelect");
  const reasonSelect = $("#reasonSelect");
  const totalAmount = $("#totalAmount");
  const statusEl = $("#formStatus");
  const paymentPanel = $("#paymentPanel");
  const qrcodeEl = $("#qrcode");
  const pixCodeEl = $("#pixCode");
  const orderIdEl = $("#orderId");
  const paymentAmountEl = $("#paymentAmount");
  const copyPix = $("#copyPix");
  const donationOptions = $("#donationOptions");

  let donationQuantity = 1;

  function centsToMoney(cents) {
    return formatter.format(cents / 100);
  }

  function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function emv(id, value) {
    const stringValue = String(value || "");
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
    return `ABD-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  function selectedProduct() {
    return products.find((product) => product.id === productSelect.value) || products[0];
  }

  function getQuantity() {
    const value = Number(new FormData(checkoutForm).get("quantity"));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
  }

  function getTotalCents() {
    return selectedProduct().price * getQuantity();
  }

  function updateTotal() {
    totalAmount.textContent = centsToMoney(getTotalCents());
  }

  function renderProducts() {
    productGrid.innerHTML = products.map((product, index) => `
      <article class="product-card">
        <div class="product-image">
          <img src="${product.imageUrl}" alt="${product.name}" loading="${index === 0 ? "eager" : "lazy"}" />
        </div>
        <span class="category">${product.category}</span>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="card-footer">
          <span class="price">${centsToMoney(product.price)}</span>
          <a class="button primary" href="#checkout" data-product="${product.id}">${product.cta}</a>
        </div>
      </article>
    `).join("");

    productSelect.innerHTML = products
      .map((product) => `<option value="${product.id}">${product.name}</option>`)
      .join("");
  }

  function renderStaticData() {
    reasonSelect.innerHTML = reasons.map((reason) => `<option value="${reason}">${reason}</option>`).join("");
    $("#impactGrid").innerHTML = metrics.map(([, label, value]) => `
      <article class="metric-card">
        <strong>${value.toLocaleString("pt-BR")}</strong>
        <span>${label}</span>
      </article>
    `).join("");
    $("#testimonialGrid").innerHTML = testimonials.map((item) => `
      <article class="testimonial-card">
        <div class="mark">“</div>
        <p>${item.content}</p>
        <span class="avatar">${item.name[0]}</span>
        <strong>${item.name}</strong>
        <p>${item.location}</p>
      </article>
    `).join("");
    $("#faqList").innerHTML = faqs.map(([question, answer]) => `
      <details class="faq-item">
        <summary>${question}</summary>
        <p>${answer}</p>
      </details>
    `).join("");
    donationOptions.innerHTML = [1, 3, 5, 10].map((qty) => `
      <button type="button" data-qty="${qty}" class="${qty === donationQuantity ? "active" : ""}">
        ${qty} ${qty === 1 ? "kit" : "kits"}
      </button>
    `).join("");
  }

  function orderFromForm(formData, orderId, pixPayload) {
    const product = selectedProduct();
    const quantity = getQuantity();
    const totalCents = product.price * quantity;
    const totalAmountValue = totalCents / 100;
    const buyerCpf = onlyDigits(formData.get("buyerCpf"));
    const recipientName = String(formData.get("recipientName")).trim();
    const city = String(formData.get("city")).trim();
    const state = String(formData.get("state")).trim().toUpperCase();
    const address = String(formData.get("address")).trim();
    const zipCode = onlyDigits(formData.get("zipCode"));

    return {
      order_id: orderId,
      order_number: orderId,
      product_id: product.id,
      product_name: product.name,
      quantity,
      total_cents: totalCents,
      total_amount: totalAmountValue,
      buyer_name: String(formData.get("name")).trim(),
      buyer_email: String(formData.get("email")).trim(),
      buyer_phone: String(formData.get("phone")).trim(),
      buyer_cpf: buyerCpf,
      buyer_cpf_cnpj: buyerCpf,
      recipient_name: recipientName,
      shipping_address: address,
      shipping_zip_code: zipCode,
      shipping_city: city,
      shipping_state: state,
      recipient_address: address,
      recipient_zipcode: zipCode,
      recipient_city: city,
      recipient_state: state,
      reason: String(formData.get("reason") || "").trim(),
      personal_message: String(formData.get("notes") || "").trim(),
      notes: String(formData.get("notes") || "").trim(),
      pix_key: onlyDigits(config.pixKey),
      pix_payload: pixPayload,
      payment_method: "pix",
      payment_status: "pending",
      order_status: "created",
      shipping_status: "aguardando_separacao",
      disclaimer_accepted: Boolean(formData.get("disclaimer"))
    };
  }

  async function insertOrStore(table, payload, localKey) {
    if (!supabaseClient) {
      const saved = JSON.parse(localStorage.getItem(localKey) || "[]");
      saved.push(payload);
      localStorage.setItem(localKey, JSON.stringify(saved));
      return { localOnly: true };
    }

    const { error } = await supabaseClient.from(table).insert(payload);
    if (error) throw error;
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

  async function handleCheckout(event) {
    event.preventDefault();
    statusEl.textContent = "Registrando pedido...";

    const formData = new FormData(checkoutForm);
    const orderId = makeOrderId();
    const pixPayload = makePixPayload({ amount: getTotalCents() / 100, txid: orderId });
    const order = orderFromForm(formData, orderId, pixPayload);

    try {
      const result = await insertOrStore("orders", order, "abrace_orders");
      statusEl.textContent = result.localOnly
        ? "Pedido gerado localmente. Preencha config.js com Supabase para salvar na nuvem."
        : "Pedido registrado no Supabase. Use o PIX abaixo para concluir.";
      showPayment(order);
    } catch (error) {
      statusEl.textContent = `Não foi possível salvar no Supabase: ${error.message}`;
      showPayment(order);
    }
  }

  async function handleDonation(event) {
    event.preventDefault();
    const formData = new FormData(donationForm);
    const payload = {
      donor_name: String(formData.get("donor_name")).trim(),
      donor_email: String(formData.get("donor_email")).trim(),
      donor_phone: String(formData.get("donor_phone") || "").trim(),
      quantity: donationQuantity,
      amount: donationQuantity * 49.9,
      message: String(formData.get("message") || "").trim(),
      payment_status: "pending",
      donation_status: "pending"
    };

    try {
      const result = await insertOrStore("donations", payload, "abrace_donations");
      $("#donationStatus").textContent = result.localOnly
        ? "Doação registrada localmente. Configure o Supabase para salvar na nuvem."
        : "Doação registrada no Supabase.";
      donationForm.reset();
    } catch (error) {
      $("#donationStatus").textContent = `Erro ao registrar doação: ${error.message}`;
    }
  }

  async function handleInstitution(event) {
    event.preventDefault();
    const formData = new FormData(institutionForm);
    const payload = {
      institution_name: String(formData.get("institution_name")).trim(),
      responsible_name: String(formData.get("responsible_name")).trim(),
      phone: String(formData.get("phone")).trim(),
      email: String(formData.get("email")).trim(),
      city: String(formData.get("city") || "").trim(),
      state: String(formData.get("state") || "").trim().toUpperCase(),
      beneficiary_indication_process: String(formData.get("beneficiary_indication_process") || "").trim(),
      status: "pending",
      terms_accepted: true
    };

    try {
      const result = await insertOrStore("partner_institutions", payload, "abrace_institutions");
      $("#institutionStatus").textContent = result.localOnly
        ? "Instituição registrada localmente. Configure o Supabase para salvar na nuvem."
        : "Instituição registrada no Supabase.";
      institutionForm.reset();
    } catch (error) {
      $("#institutionStatus").textContent = `Erro ao cadastrar instituição: ${error.message}`;
    }
  }

  renderProducts();
  renderStaticData();
  updateTotal();

  productGrid.addEventListener("click", (event) => {
    const link = event.target.closest("[data-product]");
    if (!link) return;
    productSelect.value = link.dataset.product;
    updateTotal();
  });

  donationOptions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-qty]");
    if (!button) return;
    donationQuantity = Number(button.dataset.qty);
    renderStaticData();
  });

  checkoutForm.addEventListener("input", updateTotal);
  checkoutForm.addEventListener("submit", handleCheckout);
  donationForm.addEventListener("submit", handleDonation);
  institutionForm.addEventListener("submit", handleInstitution);

  copyPix.addEventListener("click", async () => {
    await navigator.clipboard.writeText(pixCodeEl.value);
    copyPix.textContent = "Código copiado";
    setTimeout(() => {
      copyPix.textContent = "Copiar código PIX";
    }, 1800);
  });
})();
