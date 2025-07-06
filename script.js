// --- ATENÇÃO, RODRIGO! ---
// Esta seção do código simula a busca de produtos para demonstrar o funcionamento
// do frontend e da geração do PDF.
// A busca real em sites de fornecedores como "pauta.com.br" e "decdistribuidora.com.br"
// com login e web scraping (raspagem de dados) NÃO PODE ser feita diretamente
// no navegador (JavaScript de frontend) por motivos de SEGURANÇA (política CORS)
// e complexidade de autenticação.
// Para uma solução completa, você precisará de um BACKEND (um servidor) que:
// 1. Realize o login seguro nos sites dos fornecedores com as credenciais.
// 2. Faça as requisições HTTP para buscar os produtos.
// 3. Processe o HTML retornado (parseie) para extrair os preços.
// 4. Compare os preços e retorne o produto mais barato para este frontend.
// O frontend então chamaria essa API de backend.

// --- Mock Product Data (Simulação de Retorno da Busca de Fornecedores) ---
const mockProducts = [
    {
        id: 'proc-intel-i9',
        description: "PROCESSADOR INTEL CORE I9-14900 (TURBO ATE 5.8GHZ) 36MB LGA1700 14° GEN",
        price: 4816.34,
    },
    {
        id: 'placa-mae-gigabyte',
        description: "PLACA MAE (INTEL) GIGABYTE H610M K DDR4 2.0 LGA1700 12° 13° E 14° GEN",
        price: 639.21,
    },
    {
        id: 'memoria-patriot-16gb',
        description: "MEMORIA PATRIOT 16GB DDR4 3200MHZ 1.2 SIGNATURE - DESKTOP - PSD416G32002",
        price: 252.75,
    },
    {
        id: 'placa-video-rtx5060',
        description: "PLACA DE VIDEO MSI GEFORCE RTX 5060 VENTUS 2X OC 8GB GDDR7 128BITS",
        price: 2585.50,
    },
    {
        id: 'ssd-adata-512gb',
        description: "SSD ADATA LEGEND 710 512GB M.2 2280 NVME PCIE 3.0 - ALEG-710-512GCS",
        price: 332.90,
    },
    {
        id: 'fonte-acer-650w',
        description: "FONTE DE ALIMENTACAO ACER 650W AC650 80+BRONZE",
        price: 486.66,
    },
    {
        id: 'water-cooler-deepcool',
        description: "WATER COOLER DEEPCOOL GAMMAXX ANTILEAK LE500 C/6-COLORLED-R-LE500- KLNMCG-1",
        price: 374.31,
    },
    {
        id: 'kit-cooler-c3tech',
        description: "KIT COOLER C3TECH RGB F9-L650WHRGB COM CONTROLADORA",
        price: 199.28,
    },
    {
        id: 'gabinete-gamer-c3tech',
        description: "GABINETE GAMER C3TECH MT-G100BK SEM FONTE PRETO",
        price: 203.35,
    },
    {
        id: 'windows-11-pro',
        description: "WINDOWS 11 PRO ESD – DIGITAL DOWNLOAD transferivel para qualquer máquina",
        price: 1352.00,
    }
];

// --- Elementos DOM ---
const productSearchInput = document.getElementById('productSearchInput');
const searchProductBtn = document.getElementById('searchProductBtn');
const searchResultsDiv = document.getElementById('searchResults');
const productTableBody = document.getElementById('productTableBody');
const discountAmountSpan = document.getElementById('discountAmount');
const grandTotalSpan = document.getElementById('grandTotal');
const generatePdfBtn = document.getElementById('generatePdfBtn');
const budgetDocument = document.getElementById('budgetDocument');
const currentDateSpan = document.getElementById('currentDate');
const budgetNumberSpan = document.getElementById('budgetNumber');

// --- Variáveis de Estado ---
let productsInBudget = [];
let nextProductNumber = 1; // Para a coluna 'Nº' da tabela do orçamento
const DISCOUNT_VALUE = 300.00; // Desconto fixo conforme PDF de exemplo

// --- Funções Utilitárias ---

/**
 * Formata um número como string de moeda brasileira (Real).
 * @param {number} amount - O valor numérico a ser formatado.
 * @returns {string} A string de moeda formatada (ex: "R$ 1.234,56").
 */
function formatCurrency(amount) {
    return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Atualiza o desconto e o total geral exibidos no documento do orçamento.
 */
function updateTotals() {
    let subtotal = 0;
    productsInBudget.forEach(product => {
        subtotal += product.price * product.quantity;
    });

    const finalTotal = subtotal - DISCOUNT_VALUE;

    discountAmountSpan.textContent = formatCurrency(DISCOUNT_VALUE);
    grandTotalSpan.textContent = formatCurrency(finalTotal);
}

/**
 * Renderiza os resultados da busca na div de resultados dedicada.
 * @param {Array<Object>} results - Um array de objetos de produto para exibir.
 */
function renderSearchResults(results) {
    searchResultsDiv.innerHTML = ''; // Limpa resultados anteriores
    if (results.length === 0) {
        searchResultsDiv.innerHTML = '<p>Nenhum produto encontrado.</p>';
        return;
    }

    results.forEach(product => {
        const resultItem = document.createElement('div');
        resultItem.classList.add('search-result-item');
        resultItem.innerHTML = `
            <span>${product.description}</span> - <span class="price">R$ ${formatCurrency(product.price)}</span>
            <button class="add-to-budget-btn" data-product-id="${product.id}" data-price="${product.price}" data-description="${product.description}">Adicionar</button>
        `;
        searchResultsDiv.appendChild(resultItem);
    });
}

/**
 * Adiciona ou atualiza um produto na tabela do orçamento.
 * Se o produto já existe, sua quantidade e total são atualizados.
 * Caso contrário, uma nova linha é adicionada para o produto.
 * @param {Object} productData - O objeto do produto a ser adicionado/atualizado. Deve conter id, description, price.
 */
function addProductToBudget(productData) {
    const existingProduct = productsInBudget.find(p => p.id === productData.id);

    if (existingProduct) {
        // Produto já no orçamento, incrementa a quantidade
        existingProduct.quantity += 1;
        existingProduct.total = existingProduct.quantity * existingProduct.price;
        const row = document.querySelector(`tr[data-product-id="${productData.id}"]`);
        if (row) {
            row.querySelector('.product-quantity').textContent = existingProduct.quantity;
            row.querySelector('.product-total').textContent = formatCurrency(existingProduct.total);
        }
    } else {
        // Novo produto, adiciona à lista de orçamento e cria nova linha
        const newProduct = {
            id: productData.id,
            description: productData.description,
            price: productData.price,
            quantity: 1,
            total: productData.price,
            budgetNum: nextProductNumber++ // Atribui um número sequencial
        };
        productsInBudget.push(newProduct);

        const row = productTableBody.insertRow();
        row.dataset.productId = newProduct.id; // Armazena o ID do produto na linha para fácil busca
        row.innerHTML = `
            <td class="col-num">${newProduct.budgetNum}</td>
            <td class="col-description">${newProduct.description}</td>
            <td class="col-price">R$ ${formatCurrency(newProduct.price)}</td>
            <td class="col-quantity">${newProduct.quantity}</td>
            <td class="col-total product-total">R$ ${formatCurrency(newProduct.total)}</td>
        `;
    }
    updateTotals(); // Recalcula e exibe os totais
}

/**
 * Configura os valores iniciais para o documento do orçamento, como data e número do orçamento.
 */
function setupInitialBudgetValues() {
    // A data deve ser gerada automaticamente
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Mês é 0-indexed
    const year = today.getFullYear();
    currentDateSpan.textContent = `${day}/${month}/${year}`;

    // Gera um número de orçamento simples e aleatório (ex: "101", "055", "012")
    budgetNumberSpan.textContent = String(Math.floor(Math.random() * 900) + 100); // Números de 100 a 999
}

// --- Listeners de Eventos ---

// Listener de evento para o botão "Buscar"
searchProductBtn.addEventListener('click', () => {
    const searchTerm = productSearchInput.value.toLowerCase().trim();
    if (searchTerm === '') {
        renderSearchResults([]); // Limpa resultados se o termo de busca estiver vazio
        return;
    }

    // SIMULAÇÃO: Filtra produtos do mock data.
    // Em uma aplicação real, aqui haveria uma chamada fetch() para seu backend.
    const filteredProducts = mockProducts.filter(p =>
        p.description.toLowerCase().includes(searchTerm)
    );
    renderSearchResults(filteredProducts);
});

// Delegação de evento para os botões "Adicionar" dentro dos resultados da busca
searchResultsDiv.addEventListener('click', (event) => {
    const addButton = event.target.closest('.add-to-budget-btn');
    if (addButton) {
        // Extrai dados do produto dos atributos data do botão
        const productId = addButton.dataset.productId;
        const productDescription = addButton.dataset.description;
        const productPrice = parseFloat(addButton.dataset.price);

        addProductToBudget({ id: productId, description: productDescription, price: productPrice });

        // Limpa resultados da busca e o campo de input após adicionar um produto
        searchResultsDiv.innerHTML = '';
        productSearchInput.value = '';
    }
});

// Listener de evento para o botão "Gerar PDF"
generatePdfBtn.addEventListener('click', () => {
    // Esconde elementos da UI que não devem aparecer no PDF
    generatePdfBtn.style.display = 'none';
    searchProductBtn.style.display = 'none';
    searchResultsDiv.style.display = 'none';
    productSearchInput.style.display = 'none';
    // O h2 "Buscar Produto" está dentro do parentElement do input
    const searchSectionH2 = productSearchInput.parentElement.querySelector('h2');
    if (searchSectionH2) {
        searchSectionH2.style.display = 'none';
    }

    // Define a escala para html2canvas para melhor resolução no PDF.
    const scale = 3;

    html2canvas(budgetDocument, {
        scale: scale,
        useCORS: true,
        logging: false,
        windowWidth: budgetDocument.scrollWidth,
        windowHeight: budgetDocument.scrollHeight
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');

        const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        let heightLeft = imgHeight;

        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save('Orcamento_SUPPORTA.pdf');

        // Mostra novamente os elementos da UI após a conclusão da geração do PDF
        generatePdfBtn.style.display = 'block';
        searchProductBtn.style.display = 'block';
        searchResultsDiv.style.display = 'block';
        productSearchInput.style.display = 'block';
        if (searchSectionH2) {
            searchSectionH2.style.display = 'block';
        }
    });
});

// --- Configuração Inicial ---
setupInitialBudgetValues(); // Define a data inicial e o número do orçamento
updateTotals(); // Inicializa os totais (mostrará 0,00 se não houver produtos inicialmente)
