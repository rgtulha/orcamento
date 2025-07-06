document.addEventListener('DOMContentLoaded', () => {
    // --- Configuração e Inicialização do Firebase (Conforme seu script) ---
    const firebaseConfig = {
        apiKey: "AIzaSyCmUoU3I9VXjL7YbT95EfUSBnxX3ZzXTII",
        authDomain: "ordemservico-6ddca.firebaseapp.com",
        projectId: "ordemservico-6ddca",
        storageBucket: "ordemservico-6ddca.appspot.com",
        messagingSenderId: "377095307784",
        appId: "1:377095307784:web:4ce3007e49657bf3a607bd"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();

    // --- Seletores de Elementos do DOM (Mesclados e Renomeados para Clareza) ---

    // --- Budget Generator Elements ---
    const productSearchInput = document.getElementById('productSearchInput');
    const searchProductBtn = document.getElementById('searchProductBtn');
    const searchResultsDiv = document.getElementById('searchResults');
    const productTableBody = document.getElementById('productTableBody');
    const subtotalAmountSpan = document.getElementById('subtotalAmount');
    const discountInput = document.getElementById('discountInput');
    const grandTotalSpan = document.getElementById('grandTotal');
    const generatePdfBtn = document.getElementById('generatePdfBtn');
    const budgetDocument = document.getElementById('budgetDocument');
    const currentDateSpan = document.getElementById('currentDate');
    const budgetNumberSpan = document.getElementById('budgetNumber');

    // Elementos de exibição de Cliente no Orçamento
    const budgetClientNameSpan = document.getElementById('budgetClientNameSpan');
    const budgetClientCnpjCpfSpan = document.getElementById('budgetClientCnpjCpfSpan');

    // --- Firebase/Client Management Elements ---
    const selectClientBtn = document.getElementById('selectClientBtn'); // Botão para abrir modal de clientes

    // Autenticação
    const accessAuthBtn = document.getElementById('accessAuthBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const authStatus = document.getElementById('auth-status');
    const authModal = document.getElementById('authModal');
    const closeAuthModalBtn = authModal.querySelector('.close-button');
    const authEmailInput = document.getElementById('auth-email');
    const authPasswordInput = document.getElementById('auth-password');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');

    // Modal Listar/Gerenciar Clientes
    const listClientsModal = document.getElementById('listClientsModal');
    const closeListClientsModalBtn = listClientsModal.querySelector('.close-button');
    const clientListSearchInput = document.getElementById('client-list-search');
    const searchClientListBtn = document.getElementById('searchClientListBtn'); // NOVO: Botão Buscar Clientes na Lista
    const clientsTable = document.getElementById('clients-table'); // A lista de clientes
    const clientListArea = document.getElementById('client-list-area');

    // Área para ADICIONAR NOVO Cliente (dentro do Modal Listar/Gerenciar)
    const addNewClientFromListBtn = document.getElementById('addNewClientFromListBtn');
    const clientAddArea = document.getElementById('client-add-area');
    const addModalClienteNome = document.getElementById('add-modal-cliente-nome');
    const addModalClienteCnpj = document.getElementById('add-modal-cliente-cnpj');
    const addModalClienteContato = document.getElementById('add-modal-cliente-contato');
    const addModalClienteEndereco = document.getElementById('add-modal-cliente-endereco');
    const saveNewClientBtn = document.getElementById('saveNewClientBtn');
    const cancelAddClientBtn = document.getElementById('cancelAddClientBtn');

    // Área de Edição (dentro do Modal Listar/Gerenciar)
    const clientEditArea = document.getElementById('client-edit-area');
    const editModalClienteNome = document.getElementById('edit-modal-cliente-nome');
    const editModalClienteCnpj = document.getElementById('edit-modal-cliente-cnpj');
    const editModalClienteContato = document.getElementById('edit-modal-cliente-contato');
    const editModalClienteEndereco = document.getElementById('edit-modal-cliente-endereco');
    const updateClientModalBtn = document.getElementById('updateClientModalBtn');
    const cancelEditClientBtn = document.getElementById('cancelEditClientBtn');

    // --- Variáveis de Controle ---
    let productsInBudget = [];
    let nextProductNumber = 1;
    let listSearchTimeout; // Para o debounce da busca de clientes
    let currentClientBeingEdited = null; // Para armazenar o normalizedName do cliente sendo editado

    // --- Funções Auxiliares ---

    /**
     * Formata um número como string de moeda brasileira (Real).
     * @param {number} amount - O valor numérico a ser formatado.
     * @returns {string} A string de moeda formatada (ex: "1.234,56").
     */
    function formatCurrency(amount) {
        return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    /**
     * Atualiza o subtotal, desconto e total geral exibidos no documento do orçamento.
     */
    function updateTotals() {
        let subtotal = 0;
        productsInBudget.forEach(product => {
            subtotal += product.price * product.quantity;
        });

        const discountValue = parseFloat(discountInput.value) || 0;
        const finalTotal = subtotal - discountValue;

        subtotalAmountSpan.textContent = formatCurrency(subtotal);
        grandTotalSpan.textContent = formatCurrency(finalTotal);
    }

    /**
     * Renderiza os resultados da busca de produtos na div de resultados dedicada.
     * @param {Array<Object>} results - Um array de objetos de produto para exibir.
     */
    function renderSearchResults(results) {
        searchResultsDiv.innerHTML = '';
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
     * @param {Object} productData - O objeto do produto a ser adicionado/atualizado.
     */
    function addProductToBudget(productData) {
        const existingProduct = productsInBudget.find(p => p.id === productData.id);

        if (existingProduct) {
            existingProduct.quantity += 1;
            existingProduct.total = existingProduct.quantity * existingProduct.price;
            const row = document.querySelector(`tr[data-product-id="${productData.id}"]`);
            if (row) {
                row.querySelector('.product-quantity').textContent = existingProduct.quantity;
                row.querySelector('.product-total').textContent = formatCurrency(existingProduct.total);
            }
        } else {
            const newProduct = {
                id: productData.id,
                description: productData.description,
                price: productData.price,
                quantity: 1,
                total: productData.price,
                budgetNum: nextProductNumber++
            };
            productsInBudget.push(newProduct);

            const row = productTableBody.insertRow();
            row.dataset.productId = newProduct.id;
            row.innerHTML = `
                <td class="col-num">${newProduct.budgetNum}</td>
                <td class="col-description">${newProduct.description}</td>
                <td class="col-price">R$ ${formatCurrency(newProduct.price)}</td>
                <td class="col-quantity">${newProduct.quantity}</td>
                <td class="col-total product-total">R$ ${formatCurrency(newProduct.total)}</td>
            `;
        }
        updateTotals();
    }

    /**
     * Configura os valores iniciais para o documento do orçamento, como data e número do orçamento.
     */
    function setupInitialBudgetValues() {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        currentDateSpan.textContent = `${day}/${month}/${year}`;

        budgetNumberSpan.textContent = String(Math.floor(Math.random() * 900) + 100);
    }

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

    // --- Funções do Firebase ---

    // FUNÇÃO PARA ABRIR QUALQUER MODAL
    const openModal = (modalElement) => {
        modalElement.classList.add('active');
        // Opcional: focar no primeiro input do modal (se houver)
        modalElement.querySelector('input, select, textarea')?.focus();
    };

    // FUNÇÃO PARA FECHAR QUALQUER MODAL
    const closeAllModals = () => {
        authModal.classList.remove('active');
        listClientsModal.classList.remove('active');
    };

    // Lógica de Autenticação
    const updateUI = (user) => {
        if (user) {
            authStatus.textContent = `Logado como: ${user.email}`;
            accessAuthBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-block';
            selectClientBtn.style.display = 'inline-block'; // Mostra botão de selecionar cliente
        } else {
            authStatus.textContent = 'Por favor, faça login para acessar funcionalidades de cliente.';
            accessAuthBtn.style.display = 'inline-block';
            logoutBtn.style.display = 'none';
            selectClientBtn.style.display = 'none'; // Esconde botão de selecionar cliente
            // Limpar dados do cliente no orçamento se deslogar
            budgetClientNameSpan.textContent = '';
            budgetClientCnpjCpfSpan.textContent = '';
        }
    };

    auth.onAuthStateChanged(updateUI);

    // Função para preencher os campos de exibição do cliente no orçamento
    const populateBudgetClientFields = (clientData) => {
        budgetClientNameSpan.textContent = clientData.nome || '';
        budgetClientCnpjCpfSpan.textContent = clientData.cnpj || '';
    };

    // Lógica para carregar lista de clientes (adaptada)
    const loadClientsList = async (searchTerm = '') => {
        if (!auth.currentUser) {
            clientsTable.innerHTML = '<li class="no-data">Faça login para ver os clientes.</li>';
            return;
        }

        clientsTable.innerHTML = '<li class="no-data">Carregando...</li>';
        try {
            let query = db.collection('clientes').orderBy('normalizedName');
            if (searchTerm) {
                const normalizedTerm = searchTerm.toLowerCase();
                query = query.where('normalizedName', '>=', normalizedTerm)
                             .where('normalizedName', '<=', normalizedTerm + '\uf8ff');
            }
            const snapshot = await query.get();
            clientsTable.innerHTML = '';

            if (snapshot.empty) {
                clientsTable.innerHTML = '<li class="no-data">Nenhum cliente encontrado.</li>';
                return;
            }

            snapshot.forEach(doc => {
                const client = doc.data();
                const li = document.createElement('li');
                li.className = 'clients-table-row';
                // Armazena todos os dados no dataset para fácil acesso
                li.dataset.id = doc.id;
                li.dataset.nome = client.nome;
                li.dataset.cnpj = client.cnpj || '';
                li.dataset.contato = client.contato || '';
                li.dataset.endereco = client.endereco || '';

                li.innerHTML = `
                    <span class="client-name-display">${client.nome}</span>
                    <div class="client-actions">
                        <button class="select-btn">Selecionar</button>
                        <button class="edit-btn">Editar</button>
                        <button class="delete-btn">Excluir</button>
                    </div>`;
                clientsTable.appendChild(li);
            });

            // Adiciona os event listeners após a criação dos elementos
            addEventListenersToClientList();

        } catch (error) {
            console.error("Erro ao carregar lista de clientes:", error);
            clientsTable.innerHTML = '<li class="no-data">Erro ao carregar clientes.</li>';
        }
    };

    // Adiciona event listeners aos botões da lista de clientes
    const addEventListenersToClientList = () => {
        clientsTable.querySelectorAll('.clients-table-row').forEach(row => {
            const clientId = row.dataset.id;

            // AÇÃO DE SELECIONAR
            row.querySelector('.select-btn').addEventListener('click', () => {
                selectClientAndFillBudget(row.dataset);
            });
            // AÇÃO DE EDITAR
            row.querySelector('.edit-btn').addEventListener('click', () => {
                editClient(clientId, row.dataset);
            });
            // AÇÃO DE EXCLUIR
            row.querySelector('.delete-btn').addEventListener('click', () => {
                deleteClient(clientId);
            });
        });
    };

    // Função para selecionar cliente e preencher formulário principal do ORÇAMENTO
    const selectClientAndFillBudget = (clientData) => {
        populateBudgetClientFields(clientData);
        closeAllModals(); // Fecha o modal após a seleção
    };

    // Lógica para edição de cliente
    const editClient = (clientId, clientData) => {
        currentClientBeingEdited = clientId;
        editModalClienteNome.value = clientData.nome;
        editModalClienteCnpj.value = clientData.cnpj;
        editModalClienteContato.value = clientData.contato;
        editModalClienteEndereco.value = clientData.endereco;

        clientListArea.style.display = 'none';
        clientAddArea.style.display = 'none';
        clientEditArea.style.display = 'block';
        editModalClienteNome.focus();
    };

    // Lógica para exclusão de cliente
    const deleteClient = async (clientId) => {
        if (!auth.currentUser) {
            alert('Faça login para excluir clientes.');
            return;
        }

        if (confirm(`Tem certeza que deseja excluir o cliente "${clientId}"? Esta ação não pode ser desfeita.`)) {
            try {
                await db.collection('clientes').doc(clientId).delete();
                alert('Cliente excluído com sucesso!');
                loadClientsList();
            } catch (error) {
                console.error("Erro ao excluir cliente:", error);
                alert("Erro ao excluir cliente. Verifique o console para mais detalhes.");
            }
        }
    };

    // --- Listeners de Eventos ---

    // Listener de evento para o botão "Buscar" de produtos
    searchProductBtn.addEventListener('click', () => {
        const searchTerm = productSearchInput.value.toLowerCase().trim();
        if (searchTerm === '') {
            renderSearchResults([]);
            return;
        }
        const filteredProducts = mockProducts.filter(p => p.description.toLowerCase().includes(searchTerm));
        renderSearchResults(filteredProducts);
    });

    // Delegação de evento para os botões "Adicionar" dentro dos resultados da busca de produtos
    searchResultsDiv.addEventListener('click', (event) => {
        const addButton = event.target.closest('.add-to-budget-btn');
        if (addButton) {
            const productId = addButton.dataset.productId;
            const productDescription = addButton.dataset.description;
            const productPrice = parseFloat(addButton.dataset.price);

            addProductToBudget({ id: productId, description: productDescription, price: productPrice });

            searchResultsDiv.innerHTML = '';
            productSearchInput.value = '';
        }
    });

    // Listener para o input de desconto (atualiza totais ao digitar)
    discountInput.addEventListener('input', updateTotals);

    // Listener de evento para o botão "Gerar PDF"
    generatePdfBtn.addEventListener('click', () => {
        // Esconde elementos da UI que não devem aparecer no PDF
        generatePdfBtn.style.display = 'none';
        searchProductBtn.style.display = 'none';
        searchResultsDiv.style.display = 'none';
        productSearchInput.style.display = 'none';
        const searchSectionH2 = productSearchInput.parentElement.querySelector('h2');
        if (searchSectionH2) {
            searchSectionH2.style.display = 'none';
        }
        discountInput.style.display = 'none'; // Esconde o input de desconto
        selectClientBtn.style.display = 'none'; // Esconde o botão de selecionar cliente

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
            discountInput.style.display = 'inline-block';
            if (auth.currentUser) { // Mostra o botão de selecionar cliente apenas se logado
                selectClientBtn.style.display = 'inline-block';
            }
        });
    });

    // --- Firebase/Client Management Event Listeners ---

    // Event Listeners para abrir modais
    accessAuthBtn.addEventListener('click', () => {
        openModal(authModal);
        authEmailInput.value = '';
        authPasswordInput.value = '';
    });

    selectClientBtn.addEventListener('click', () => {
        if (!auth.currentUser) return alert('Faça login para gerenciar clientes.');
        openModal(listClientsModal);
        clientListArea.style.display = 'block';
        clientAddArea.style.display = 'none';
        clientEditArea.style.display = 'none';
        clientListSearchInput.value = '';
        loadClientsList();
    });

    // Event Listeners para fechar modais
    [closeAuthModalBtn, closeListClientsModalBtn].forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    window.addEventListener('click', (event) => {
        if (event.target === authModal || event.target === listClientsModal) {
            closeAllModals();
        }
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeAllModals();
        }
    });

    // Autenticação
    logoutBtn.addEventListener('click', async () => {
        try {
            await auth.signOut();
            alert('Logout realizado com sucesso!');
            // Limpa dados do cliente no orçamento
            budgetClientNameSpan.textContent = '';
            budgetClientCnpjCpfSpan.textContent = '';
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
            alert(`Erro ao fazer logout: ${error.message}`);
        }
    });

    registerBtn.addEventListener('click', async () => {
        const email = authEmailInput.value;
        const password = authPasswordInput.value;
        try {
            await auth.createUserWithEmailAndPassword(email, password);
            alert('Usuário cadastrado e logado com sucesso!');
            closeAllModals();
        } catch (error) {
            console.error("Erro ao cadastrar:", error);
            alert(`Erro ao cadastrar: ${error.message}`);
        }
    });

    loginBtn.addEventListener('click', async () => {
        const email = authEmailInput.value;
        const password = authPasswordInput.value;
        try {
            await auth.signInWithEmailAndPassword(email, password);
            alert('Login realizado com sucesso!');
            closeAllModals();
        } catch (error) {
            console.error("Erro ao fazer login:", error);
            alert(`Erro ao fazer login: ${error.message}`);
        }
    });

    // Lógica do botão Buscar Clientes na Lista
    searchClientListBtn.addEventListener('click', () => {
        const searchTerm = clientListSearchInput.value.trim();
        loadClientsList(searchTerm); // Força a busca imediatamente
    });

    // Busca de Cliente no Modal (em tempo real com debounce)
    clientListSearchInput.addEventListener('input', () => {
        clearTimeout(listSearchTimeout);
        const searchTerm = clientListSearchInput.value.trim();
        listSearchTimeout = setTimeout(() => loadClientsList(searchTerm), 300);
    });

    // Lógica para ADICIONAR NOVO Cliente (dentro do Modal Gerenciar)
    addNewClientFromListBtn.addEventListener('click', () => {
        clientListArea.style.display = 'none';
        clientEditArea.style.display = 'none';
        clientAddArea.style.display = 'block';
        addModalClienteNome.value = '';
        addModalClienteCnpj.value = '';
        addModalClienteContato.value = '';
        addModalClienteEndereco.value = '';
        addModalClienteNome.focus();
    });

    saveNewClientBtn.addEventListener('click', async () => {
        if (!auth.currentUser) return alert('Você precisa estar logado para salvar um cliente.');

        const nomeOriginal = addModalClienteNome.value.trim();
        if (!nomeOriginal) return alert('O "Nome da Empresa" é obrigatório!');

        const normalizedName = nomeOriginal.toLowerCase();
        const clientData = {
            nome: nomeOriginal,
            normalizedName: normalizedName,
            cnpj: addModalClienteCnpj.value.trim(),
            contato: addModalClienteContato.value.trim(),
            endereco: addModalClienteEndereco.value.trim(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            addedBy: auth.currentUser.email
        };

        try {
            await db.collection('clientes').doc(normalizedName).set(clientData);
            alert(`Cliente "${nomeOriginal}" salvo com sucesso!`);

            clientAddArea.style.display = 'none';
            clientListArea.style.display = 'block';
            loadClientsList();
        } catch (error) {
            console.error("Erro ao salvar cliente:", error);
            alert("Erro ao salvar cliente. Verifique o console para mais detalhes. Certifique-se de estar logado e com permissão.");
        }
    });

    cancelAddClientBtn.addEventListener('click', () => {
        clientAddArea.style.display = 'none';
        clientListArea.style.display = 'block';
    });

    // Lógica para ATUALIZAR Cliente (dentro do Modal Gerenciar)
    updateClientModalBtn.addEventListener('click', async () => {
        if (!auth.currentUser || !currentClientBeingEdited) {
            alert('Erro: Nenhum cliente selecionado para atualização ou você não está logado.');
            return;
        }

        const originalNormalizedName = currentClientBeingEdited;
        const newNome = editModalClienteNome.value.trim();
        const newNormalizedName = newNome.toLowerCase();
        const newCnpj = editModalClienteCnpj.value.trim();
        const newContato = editModalClienteContato.value.trim();
        const newEndereco = editModalClienteEndereco.value.trim();

        if (!newNome) {
            alert('O "Nome da Empresa" é obrigatório!');
            return;
        }

        const clientUpdateData = {
            nome: newNome,
            normalizedName: newNormalizedName,
            cnpj: newCnpj,
            contato: newContato,
            endereco: newEndereco,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            addedBy: auth.currentUser.email
        };

        try {
            if (originalNormalizedName !== newNormalizedName) {
                const batch = db.batch();
                batch.set(db.collection('clientes').doc(newNormalizedName), clientUpdateData);
                batch.delete(db.collection('clientes').doc(originalNormalizedName));
                await batch.commit();
                alert(`Cliente "${newNome}" atualizado e movido com sucesso!`);
            } else {
                await db.collection('clientes').doc(originalNormalizedName).update(clientUpdateData);
                alert(`Cliente "${newNome}" atualizado com sucesso!`);
            }

            clientEditArea.style.display = 'none';
            clientListArea.style.display = 'block';
            currentClientBeingEdited = null;
            loadClientsList();

        } catch (error) {
            console.error("Erro ao atualizar cliente:", error);
            alert("Erro ao atualizar cliente. Verifique o console para mais detalhes.");
        }
    });

    cancelEditClientBtn.addEventListener('click', () => {
        clientEditArea.style.display = 'none';
        clientListArea.style.display = 'block';
        currentClientBeingEdited = null;
    });

    // --- Configuração Inicial ---
    setupInitialBudgetValues();
    updateTotals();
});
