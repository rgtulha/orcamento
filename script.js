document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - script.js iniciado.');

    // --- Configuração e Inicialização do Firebase ---
    const firebaseConfig = {
        apiKey: "AIzaSyCmUoU3I9VXjL7YbT95EfUSBnxX3ZzXTII",
        authDomain: "ordemservico-6ddca.firebaseapp.com",
        projectId: "ordemservico-6ddca",
        storageBucket: "ordemservico-6ddca.appspot.com",
        messagingSenderId: "377095307784",
        appId: "1:377095307784:web:4ce3007e49657bf3a607bd"
    };

    try {
        firebase.initializeApp(firebaseConfig);
        console.log('Firebase inicializado com sucesso.');
    } catch (error) {
        console.error('Erro ao inicializar Firebase:', error);
    }

    const db = firebase.firestore();
    const auth = firebase.auth();

    // --- Seletores de Elementos do DOM ---

    // Budget Generator Elements
    const productTableBody = document.getElementById('productTableBody');
    const subtotalAmountSpan = document.getElementById('subtotalAmount');
    const discountInput = document.getElementById('discountInput');
    const discountAmountDisplay = document.getElementById('discountAmountDisplay'); // Elemento para exibir o desconto
    const grandTotalSpan = document.getElementById('grandTotal');
    const generatePdfBtn = document.getElementById('generatePdfBtn');
    const appContainer = document.querySelector('.app-container');
    const currentDateSpan = document.getElementById('currentDate');
    const budgetNumberSpan = document.getElementById('budgetNumber');

    // Elementos de exibição de Cliente no Orçamento
    const budgetClientNameSpan = document.getElementById('budgetClientNameSpan');
    const budgetClientCnpjCpfSpan = document.getElementById('budgetClientCnpjCpfSpan');

    // Botões de Ação Principal
    const selectClientBtn = document.getElementById('selectClientBtn');
    const addProductBtn = document.getElementById('addProductBtn');

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
    const searchClientListBtn = document.getElementById('searchClientListBtn');
    const clientsTable = document.getElementById('clients-table');
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

    // Modal para Adicionar Produto Manualmente
    const addProductModal = document.getElementById('addProductModal');
    const closeAddProductModalBtn = addProductModal.querySelector('.close-button');
    const productDescriptionInput = document.getElementById('productDescriptionInput');
    const productQuantityInput = document.getElementById('productQuantityInput');
    const productUnitPriceInput = document.getElementById('productUnitPriceInput');
    const confirmAddProductBtn = document.getElementById('confirmAddProductBtn');
    const cancelAddProductBtn = document.getElementById('cancelAddProductBtn');

    // --- Variáveis de Controle ---
    let productsInBudget = [];
    let nextProductNumber = 1; // Para a coluna 'Nº' da tabela do orçamento
    let listSearchTimeout;
    let currentClientBeingEdited = null;

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
        console.log('--- updateTotals() called ---');
        console.log('productsInBudget:', productsInBudget);

        let subtotal = 0;
        productsInBudget.forEach(product => {
            console.log(`Product: ${product.description}, Quantity: ${product.quantity}, UnitPrice: ${product.unitPrice}, Total: ${product.total}`);
            subtotal += product.total;
        });
        console.log('Calculated subtotal:', subtotal);

        // Garante que discountInput.value é um número válido, ou 0
        const discountValue = parseFloat(discountInput.value.replace(',', '.')) || 0; 
        console.log('Discount input value (raw):', discountInput.value);
        console.log('Parsed discountValue:', discountValue);

        const finalTotal = subtotal - discountValue;
        console.log('Calculated finalTotal (subtotal - discount):', finalTotal);

        subtotalAmountSpan.textContent = formatCurrency(subtotal);
        discountAmountDisplay.textContent = formatCurrency(discountValue); // Atualiza o span do desconto
        grandTotalSpan.textContent = formatCurrency(finalTotal);
        console.log('--- updateTotals() finished ---');
    }

    /**
     * Adiciona um produto à tabela do orçamento e atualiza os totais.
     * @param {Object} productData - Objeto contendo id, description, quantity, unitPrice, total.
     */
    function addProductToBudgetTable(productData) {
        const row = productTableBody.insertRow();
        row.dataset.productId = productData.id; // Garante um ID único para a linha
        row.innerHTML = `
            <td class="col-num">${productData.budgetNum}</td>
            <td class="col-description">${productData.description}</td>
            <td class="col-price">R\$${formatCurrency(productData.unitPrice)}</td> <!-- MODIFICADO -->
            <td class="col-quantity">${productData.quantity}</td>
            <td class="col-total product-total">R\$${formatCurrency(productData.total)}</td> <!-- MODIFICADO -->
        `;
        // Poderia adicionar um botão de remover item aqui se necessário
    }

    /**
     * Limpa os campos do modal de adição de produto.
     */
    function clearAddProductModalFields() {
        productDescriptionInput.value = '';
        productQuantityInput.value = '1';
        productUnitPriceInput.value = '0.00';
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

    // --- Funções do Firebase ---

    // FUNÇÃO PARA ABRIR QUALQUER MODAL
    const openModal = (modalElement) => {
        console.log(`Abrindo modal: ${modalElement.id}`);
        modalElement.classList.add('active');
        modalElement.querySelector('input, select, textarea')?.focus();
    };

    // FUNÇÃO PARA FECHAR QUALQUER MODAL
    const closeAllModals = () => {
        console.log('Fechando todos os modais.');
        authModal.classList.remove('active');
        listClientsModal.classList.remove('active');
        addProductModal.classList.remove('active');
    };

    // Lógica de Autenticação - CRÍTICO para a visibilidade dos botões
    const updateUI = (user) => {
        console.log('updateUI acionada. Status do usuário:', user ? user.email : 'Nenhum usuário logado');

        if (user) {
            authStatus.textContent = `Logado como: ${user.email}`;
            accessAuthBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-block';
            selectClientBtn.style.display = 'inline-block';
            addProductBtn.style.display = 'inline-block';
            console.log('Botões de funcionalidade e "Sair" visíveis. "Acessar" oculto.');
        } else {
            authStatus.textContent = 'Por favor, faça login para acessar funcionalidades de cliente e orçamento.';
            accessAuthBtn.style.display = 'inline-block';
            logoutBtn.style.display = 'none';
            selectClientBtn.style.display = 'none';
            addProductBtn.style.display = 'none';
            console.log('Botões de funcionalidade e "Sair" ocultos. "Acessar" visível.');
            budgetClientNameSpan.textContent = '';
            budgetClientCnpjCpfSpan.textContent = '';
        }
    };

    // Este listener é CRÍTICO: ele executa updateUI quando o status de autenticação muda.
    auth.onAuthStateChanged(updateUI);

    // Função para preencher os campos de exibição do cliente no orçamento
    const populateBudgetClientFields = (clientData) => {
        budgetClientNameSpan.textContent = clientData.nome || '';
        budgetClientCnpjCpfSpan.textContent = clientData.cnpj || '';
    };

    // Lógica para carregar lista de clientes
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

            addEventListenersToClientList();

        } catch (error) {
            console.error("Erro ao carregar lista de clientes:", error);
            clientsTable.innerHTML = '<li class="no-data">Erro ao carregar clientes.</li>';
        }
    };

    const addEventListenersToClientList = () => {
        clientsTable.querySelectorAll('.clients-table-row').forEach(row => {
            const clientId = row.dataset.id;

            row.querySelector('.select-btn').addEventListener('click', () => {
                selectClientAndFillBudget(row.dataset);
            });
            row.querySelector('.edit-btn').addEventListener('click', () => {
                editClient(clientId, row.dataset);
            });
            row.querySelector('.delete-btn').addEventListener('click', () => {
                deleteClient(clientId);
            });
        });
    };

    const selectClientAndFillBudget = (clientData) => {
        populateBudgetClientFields(clientData);
        closeAllModals();
    };

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

    // Listener para o input de desconto (atualiza totais ao digitar)
    discountInput.addEventListener('input', updateTotals);

    // Listener de evento para o botão "Imprimir"
    generatePdfBtn.addEventListener('click', () => {
        // Adiciona a classe para ocultar elementos de UI durante a impressão
        document.body.classList.add('print-mode');
        console.log('PDF gerando. Modo de impressão ativado.');

        const scale = 4; // AUMENTADO para melhor qualidade

        html2canvas(appContainer, {
            scale: scale,
            useCORS: true,
            logging: false,
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

            // Remove a classe para restaurar a UI
            document.body.classList.remove('print-mode');
            console.log('PDF gerado. Modo de impressão desativado.');
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
        console.log('Botão Adicionar/Selecionar Cliente clicado.');
        if (!auth.currentUser) {
            alert('Faça login para gerenciar clientes.');
            return;
        }
        openModal(listClientsModal);
        clientListArea.style.display = 'block';
        clientAddArea.style.display = 'none';
        clientEditArea.style.display = 'none';
        clientListSearchInput.value = '';
        loadClientsList();
    });

    // Event Listeners para fechar modais (geral)
    [closeAuthModalBtn, closeListClientsModalBtn, closeAddProductModalBtn].forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    window.addEventListener('click', (event) => {
        if (event.target === authModal || event.target === listClientsModal || event.target === addProductModal) {
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
            budgetClientNameSpan.textContent = '';
            budgetClientCnpjCpfSpan.textContent = '';
            console.log('Logout bem-sucedido. updateUI será acionado.');
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
            console.log('Registro bem-sucedido. updateUI será acionado.');
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
            console.log('Login bem-sucedido. updateUI será acionado.');
        } catch (error) {
            console.error("Erro ao fazer login:", error);
            alert(`Erro ao fazer login: ${error.message}`);
        }
    });

    // Lógica do botão Buscar Clientes na Lista
    searchClientListBtn.addEventListener('click', () => {
        const searchTerm = clientListSearchInput.value.trim();
        loadClientsList(searchTerm);
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

    // --- Lógica para Adicionar Produto ---

    addProductBtn.addEventListener('click', () => {
        console.log('Botão Adicionar Produto clicado.');
        if (!auth.currentUser) {
            alert('Faça login para adicionar produtos ao orçamento.');
            return;
        }
        openModal(addProductModal);
        clearAddProductModalFields();
        productDescriptionInput.focus();
    });

    confirmAddProductBtn.addEventListener('click', () => {
        const description = productDescriptionInput.value.trim();
        // Garante que quantity é um número inteiro e unitPrice é um float, substituindo ',' por '.'
        const quantity = parseInt(productQuantityInput.value);
        const unitPrice = parseFloat(productUnitPriceInput.value.replace(',', '.'));

        console.log(`Adding product - Desc: ${description}, Qty: ${quantity}, UnitPrice: ${unitPrice}`);
        console.log(`Typeof Qty: ${typeof quantity}, Typeof UnitPrice: ${typeof unitPrice}`);
        console.log(`isNaN(quantity): ${isNaN(quantity)}, isNaN(unitPrice): ${isNaN(unitPrice)}`);


        if (!description) {
            alert('A descrição do produto é obrigatória.');
            productDescriptionInput.focus();
            return;
        }
        if (isNaN(quantity) || quantity <= 0) {
            alert('A quantidade deve ser um número inteiro positivo.');
            productQuantityInput.focus();
            return;
        }
        if (isNaN(unitPrice) || unitPrice < 0) {
            alert('O valor unitário deve ser um número não negativo.');
            productUnitPriceInput.focus();
            return;
        }

        const total = quantity * unitPrice;

        const newProduct = {
            id: Date.now(),
            budgetNum: nextProductNumber++,
            description: description,
            quantity: quantity,
            unitPrice: unitPrice,
            total: total
        };

        productsInBudget.push(newProduct);
        addProductToBudgetTable(newProduct);
        updateTotals(); // Chama updateTotals após adicionar o produto
        closeAllModals();
    });

    cancelAddProductBtn.addEventListener('click', () => {
        closeAllModals();
        clearAddProductModalFields();
    });

    // --- Configuração Inicial ---
    setupInitialBudgetValues();
    updateTotals(); // Garante que os totais são calculados no carregamento inicial
});
