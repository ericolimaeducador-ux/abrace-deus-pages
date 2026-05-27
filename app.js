(function () {
  const fallbackConfig = {
    supabaseUrl: "",
    supabaseAnonKey: "",
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
  const orderIdEl = $("#orderId");
  const paymentAmountEl = $("#paymentAmount");
  const donationOptions = $("#donationOptions");
  const shippingAmountEl = $("#shippingAmount");
  const calculateShippingButton = $("#calculateShipping");
  const paymentStatusEl = $("#paymentStatus");
  const zipCodeEl = $("#zipCode");
  const addressEl = $("#address");
  const districtEl = $("#district");
  const cityEl = $("#city");
  const stateEl = $("#state");

  let donationQuantity = 1;
  let shippingCents = 0;
  let checkoutSession = null;
  let paymentBrickController = null;

  function centsToMoney(cents) {
    return formatter.format(cents / 100);
  }

  function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function selectedProduct() {
    return products.find((product) => product.id === productSelect.value) || products[0];
  }

  function getQuantity() {
    const value = Number(new FormData(checkoutForm).get("quantity"));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
  }

  function getTotalCents() {
    return selectedProduct().price * getQuantity() + shippingCents;
  }

  function updateTotal() {
    totalAmount.textContent = centsToMoney(getTotalCents());
    if (shippingAmountEl) {
      shippingAmountEl.textContent = shippingCents > 0 ? centsToMoney(shippingCents) : "Informe o CEP";
    }
  }

  function shippingForState(state) {
    const normalizedState = String(state || "").trim().toUpperCase();
    const rates = {
      SP: 1890,
      RJ: 2490,
      MG: 2490,
      ES: 2690,
      PR: 2690,
      SC: 2990,
      RS: 3290,
      DF: 3290,
      GO: 3490,
      MS: 3490,
      MT: 3990,
      BA: 3990,
      SE: 4290,
      AL: 4290,
      PE: 4490,
      PB: 4490,
      RN: 4690,
      CE: 4690,
      PI: 4990,
      MA: 4990,
      TO: 4990,
      PA: 5490,
      AP: 5990,
      AM: 5990,
      RR: 6490,
      RO: 6490,
      AC: 6990
    };
    return rates[normalizedState] || 4990;
  }

  async function fillAddressFromZip() {
    const zipCode = onlyDigits(zipCodeEl && zipCodeEl.value);
    if (zipCode.length !== 8) {
      statusEl.textContent = "Informe um CEP com 8 números para calcular o frete.";
      return false;
    }

    statusEl.textContent = "Calculando frete...";

    try {
      const response = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`);
      const data = await response.json();
      if (data.erro) throw new Error("CEP não encontrado.");

      addressEl.value = addressEl.value || data.logradouro || "";
      districtEl.value = districtEl.value || data.bairro || "";
      cityEl.value = data.localidade || cityEl.value;
      stateEl.value = String(data.uf || stateEl.value).toUpperCase();
      shippingCents = shippingForState(stateEl.value);
      statusEl.textContent = "Frete calculado. Confira os dados de entrega.";
      updateTotal();
      return true;
    } catch (error) {
      shippingCents = 0;
      updateTotal();
      statusEl.textContent = `Não foi possível calcular o frete: ${error.message}`;
      return false;
    }
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

  function checkoutPayloadFromForm(formData) {
    const product = selectedProduct();
    const quantity = getQuantity();
    const subtotalCents = product.price * quantity;
    const totalCents = subtotalCents + shippingCents;
    const totalAmountValue = totalCents / 100;
    const buyerCpf = onlyDigits(formData.get("buyerCpf"));
    const recipientName = String(formData.get("recipientName")).trim();
    const city = String(formData.get("city")).trim();
    const state = String(formData.get("state")).trim().toUpperCase();
    const address = String(formData.get("address")).trim();
    const zipCode = onlyDigits(formData.get("zipCode"));

    return {
      product,
      quantity,
      subtotal_cents: subtotalCents,
      shipping_cents: shippingCents,
      total_cents: totalCents,
      total_amount: totalAmountValue,
      product_id: product.id,
      product_name: product.name,
      buyer_name: String(formData.get("name")).trim(),
      buyer_email: String(formData.get("email")).trim(),
      buyer_phone: String(formData.get("phone")).trim(),
      buyer_cpf: buyerCpf,
      buyer_cpf_cnpj: buyerCpf,
      recipient_name: recipientName,
      recipient_phone: String(formData.get("recipientPhone") || "").trim(),
      shipping_address: address,
      recipient_address: address,
      recipient_number: String(formData.get("number")).trim(),
      recipient_complement: String(formData.get("complement") || "").trim(),
      recipient_district: String(formData.get("district")).trim(),
      shipping_zip_code: zipCode,
      shipping_city: city,
      shipping_state: state,
      recipient_address: address,
      recipient_zipcode: zipCode,
      recipient_city: city,
      recipient_state: state,
      reason: String(formData.get("reason") || "").trim(),
      personal_message: String(formData.get("notes") || "").trim(),
      signature: String(formData.get("signature") || "").trim(),
      notes: String(formData.get("notes") || "").trim(),
      payment_method: "mercado_pago",
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

  async function createCheckoutSession(order) {
    if (!config.checkoutFunctionUrl) {
      throw new Error("Configure checkoutFunctionUrl no config.js.");
    }

    const response = await fetch(config.checkoutFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.supabaseAnonKey || "",
        Authorization: `Bearer ${config.supabaseAnonKey || ""}`
      },
      body: JSON.stringify({
        action: "create_order",
        order
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Falha ao criar pedido.");
    return data;
  }

  async function submitMercadoPagoPayment(formData) {
    const response = await fetch(config.checkoutFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.supabaseAnonKey || "",
        Authorization: `Bearer ${config.supabaseAnonKey || ""}`
      },
      body: JSON.stringify({
        action: "process_payment",
        orderId: checkoutSession.orderId,
        payment: formData
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Falha ao processar pagamento.");
    return data;
  }

  async function renderPaymentBrick(session) {
    if (!window.MercadoPago || !config.mercadoPagoPublicKey) {
      paymentStatusEl.textContent = "Configure mercadoPagoPublicKey no config.js para habilitar PIX e cartão.";
      return;
    }

    if (paymentBrickController) {
      paymentBrickController.unmount();
      paymentBrickController = null;
    }

    const mp = new window.MercadoPago(config.mercadoPagoPublicKey, { locale: "pt-BR" });
    const bricksBuilder = mp.bricks();
    paymentBrickController = await bricksBuilder.create("payment", "paymentBrick_container", {
      initialization: {
        amount: session.totalAmount,
        preferenceId: session.preferenceId || undefined
      },
      customization: {
        paymentMethods: {
          creditCard: "all",
          debitCard: "all",
          bankTransfer: "all",
          mercadoPago: session.preferenceId ? ["wallet_purchase"] : [],
          prepaidCard: "all"
        }
      },
      callbacks: {
        onReady: () => {
          paymentStatusEl.textContent = "";
        },
        onSubmit: ({ formData }) => new Promise((resolve, reject) => {
          paymentStatusEl.textContent = "Processando pagamento...";
          submitMercadoPagoPayment(formData)
            .then((result) => {
              paymentStatusEl.textContent = result.message || "Pagamento enviado. Acompanhe o status pelo Mercado Pago.";
              resolve();
            })
            .catch((error) => {
              paymentStatusEl.textContent = error.message;
              reject(error);
            });
        }),
        onError: (error) => {
          paymentStatusEl.textContent = "Não foi possível carregar o checkout do Mercado Pago. Verifique se a Public Key e o Access Token são do mesmo ambiente.";
          console.error(error);
        }
      }
    });
  }

  async function showPayment(session) {
    paymentPanel.hidden = false;
    orderIdEl.textContent = session.orderId;
    paymentAmountEl.textContent = centsToMoney(Math.round(session.totalAmount * 100));
    await renderPaymentBrick(session);

    paymentPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleCheckout(event) {
    event.preventDefault();
    statusEl.textContent = "";

    if (!checkoutForm.checkValidity()) {
      checkoutForm.reportValidity();
      return;
    }

    if (shippingCents <= 0) {
      const calculated = await fillAddressFromZip();
      if (!calculated) return;
    }

    const formData = new FormData(checkoutForm);
    const order = checkoutPayloadFromForm(formData);
    statusEl.textContent = "Criando pedido...";

    try {
      checkoutSession = await createCheckoutSession(order);
      statusEl.textContent = "Pedido criado. Escolha o pagamento abaixo.";
      await showPayment(checkoutSession);
    } catch (error) {
      statusEl.textContent = `Não foi possível iniciar o checkout: ${error.message}`;
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

  checkoutForm.addEventListener("input", (event) => {
    if (["zipCode", "state"].includes(event.target.name)) {
      shippingCents = 0;
    }
    updateTotal();
  });
  checkoutForm.addEventListener("submit", handleCheckout);
  donationForm.addEventListener("submit", handleDonation);
  institutionForm.addEventListener("submit", handleInstitution);
  calculateShippingButton.addEventListener("click", fillAddressFromZip);

})();
