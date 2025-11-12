// ===========================================
// CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// ===========================================

const firebaseConfig = {
    apiKey: "AIzaSyAGFbBUOt8-74eDVlydPubn0hBolGfSqzo",
    authDomain: "usguridaunoesc1.firebaseapp.com",
    projectId: "usguridaunoesc1",
    storageBucket: "usguridaunoesc1.firebasestorage.app",
    messagingSenderId: "737967909997",
    appId: "1:737967909997:web:83482f7dbd034047cca364",
    measurementId: "G-14XB3SB6XS"
};

const AVATAR_URLS = [
    "img/avatars/guri_verde.png",
    "img/avatars/guri_azul.png",
    "img/avatars/guri_vermelho.png",
    "img/avatars/guri_amarelo.png",
    "img/avatars/guri_roxo.png"
    // Certifique-se de que esses arquivos existam na sua pasta img/avatars/
];

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Variável global para usuário logado (Usada para o login manual e chat)
let currentUser = null;
// Variável para controlar o listener de recados e evitar duplicidade
let recadosUnsubscribe = null; 
// Variável para controlar o listener de chat e evitar conflito
let chatUnsubscribe = null; 

// ===========================================
// FUNÇÕES DE NAVEGAÇÃO E AUTENTICAÇÃO
// ===========================================

function showPage(pageId) {
    // Desliga listeners de outras páginas para economizar recursos
    if (chatUnsubscribe) {
        chatUnsubscribe();
        chatUnsubscribe = null;
    }
    if (recadosUnsubscribe) {
        recadosUnsubscribe();
        recadosUnsubscribe = null;
    }
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Inicia o listener específico para a página
    if (pageId === 'chat') {
        loadChat();
        updateChatAccess();
    }

    if (pageId === 'recados') {
        loadRecados();
    }
}

function toggleAuthMode() {
    const loginForm = document.getElementById('loginForm');
    const cadastroForm = document.getElementById('cadastroForm');
    const isLogin = loginForm.style.display !== 'none';
    
    loginForm.style.display = isLogin ? 'none' : 'block';
    cadastroForm.style.display = isLogin ? 'block' : 'none';
    
    const msg = document.getElementById('authMessage');
    if (msg) msg.style.display = 'none';
}

function doLogout() {
    if (confirm('Tem certeza que quer sair do rolê?')) {
        currentUser = null;
        localStorage.removeItem('guriUsername');
        updateAuthUI();
        updateChatAccess(); 
        alert('Até mais! Deslogado com sucesso.');
        showPage('intro');
    }
}

// ===========================================
// ATUALIZAR INTERFACE
// ===========================================

function updateAuthUI() {
    const authLink = document.getElementById('auth-link');
    const usernameDisplay = document.getElementById('guri-username-display');
    
    if (currentUser) {
        authLink.textContent = 'Sair';
        authLink.onclick = (e) => {
            e.preventDefault();
            doLogout();
        };
        if (usernameDisplay) {
            usernameDisplay.textContent = currentUser.toUpperCase();
        }
    } else {
        authLink.textContent = 'Login';
        authLink.onclick = (e) => {
            e.preventDefault();
            showPage('login');
        };
        if (usernameDisplay) {
            usernameDisplay.textContent = '';
        }
    }

    // Garante que o estado do Chat seja atualizado em qualquer mudança de login
    updateChatAccess();
}

// Inicialização e Event Listeners globais
window.addEventListener('load', () => {
    // 1. Verifica sessão ao carregar
    const savedUsername = localStorage.getItem('guriUsername');
    if (savedUsername) {
        currentUser = savedUsername;
        updateAuthUI();
    }
    
    // 2. Inicializa a personalização da camiseta (MANTIDO)
    atualizarCamiseta();

    // 3. Adiciona o listener para enviar mensagem com a tecla ENTER (CORRIGIDO)
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !chatInput.disabled) {
                event.preventDefault(); 
                sendMessage();
            }
        });
    }
});
// ===========================================
// CADASTRO
// ===========================================

document.getElementById('cadastroForm').onsubmit = function(e) {
    e.preventDefault();
    
    const username = document.getElementById('usernameCadastro').value.trim().toLowerCase();
    const password = document.getElementById('senhaCadastro').value;
    const msgDiv = document.getElementById('authMessage');
    const btn = this.querySelector('button[type="submit"]');
    
    // Limpa mensagem anterior
    msgDiv.style.display = 'none';
    
    // VALIDAÇÕES COM ALERTA VISÍVEL
    if (username.length < 3) {
        alert('❌ O username deve ter pelo menos 3 caracteres!');
        msgDiv.innerHTML = '❌ O username deve ter pelo menos 3 caracteres!';
        msgDiv.style.cssText = 'display: block !important; background-color: rgba(255, 0, 0, 0.3) !important; border: 2px solid #ff0000 !important; color: #ff0000 !important; padding: 15px !important; margin-top: 15px !important; border-radius: 8px !important; font-weight: bold !important; font-size: 1.1rem !important;';
        return;
    }
    
    if (password.length < 6) {
        alert('❌ A senha deve ter pelo menos 6 caracteres!');
        msgDiv.innerHTML = '❌ A senha deve ter pelo menos 6 caracteres!';
        msgDiv.style.cssText = 'display: block !important; background-color: rgba(255, 0, 0, 0.3) !important; border: 2px solid #ff0000 !important; color: #ff0000 !important; padding: 15px !important; margin-top: 15px !important; border-radius: 8px !important; font-weight: bold !important; font-size: 1.1rem !important;';
        return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Cadastrando...';
    
    // Verifica se username existe
    db.collection("users").doc(username).get()
        .then(doc => {
            if (doc.exists) {
                alert('❌ Este username já existe! Escolha outro.');
                msgDiv.innerHTML = '❌ Este username já existe! Escolha outro.';
                msgDiv.style.display = 'block';
                msgDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                msgDiv.style.borderColor = '#ff0000';
                msgDiv.style.color = '#ff0000';
                msgDiv.style.padding = '15px';
                msgDiv.style.marginTop = '15px';
                msgDiv.style.borderRadius = '8px';
                msgDiv.style.fontWeight = 'bold';
                msgDiv.style.border = '2px solid #ff0000';
                btn.disabled = false;
                btn.textContent = 'Criar Conta';
                return Promise.reject('Username já existe');
            }
            
            // Salva usuário (SENHA SEM CRIPTOGRAFIA)
            return db.collection("users").doc(username).set({
                username: username,
                password: password,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                // NOVO: Salva um avatar URL aleatório
                avatarUrl: getDefaultAvatar() 
            });
        })
        .then(() => {
            // Login automático
            currentUser = username;
            localStorage.setItem('guriUsername', username);
            alert('✅ Cadastro concluído! Seja bem-vindo!');
            localStorage.setItem('guriAvatarUrl', getDefaultAvatar());
            updateAuthUI();
            
            msgDiv.innerHTML = '✅ Cadastro concluído! Seja bem-vindo!';
            msgDiv.style.display = 'block';
            msgDiv.style.backgroundColor = 'rgba(0, 255, 115, 0.3)';
            msgDiv.style.borderColor = '#00ff73';
            msgDiv.style.color = '#00ff73';
            msgDiv.style.padding = '15px';
            msgDiv.style.marginTop = '15px';
            msgDiv.style.borderRadius = '8px';
            msgDiv.style.fontWeight = 'bold';
            msgDiv.style.border = '2px solid #00ff73';
            
            setTimeout(() => showPage('intro'), 2000);
        })
        .catch(err => {
            if (err !== 'Username já existe') {
                msgDiv.innerHTML = '❌ Erro: ' + err.message;
                msgDiv.style.display = 'block';
                msgDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                msgDiv.style.borderColor = '#ff0000';
                msgDiv.style.color = '#ff0000';
                msgDiv.style.padding = '15px';
                msgDiv.style.marginTop = '15px';
                msgDiv.style.borderRadius = '8px';
                msgDiv.style.fontWeight = 'bold';
                msgDiv.style.border = '2px solid #ff0000';
            }
        })
        .finally(() => {
            btn.disabled = false;
            btn.textContent = 'Criar Conta';
        });
};

// ===========================================
// LOGIN
// ===========================================

document.getElementById('loginForm').onsubmit = function(e) {
    e.preventDefault();
    
    const username = document.getElementById('usernameLogin').value.trim().toLowerCase();
    const password = document.getElementById('senhaLogin').value;
    const msgDiv = document.getElementById('authMessage');
    const btn = document.getElementById('btnLogin');
    
    msgDiv.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Entrando...';
    
    // Busca usuário
    db.collection("users").doc(username).get()
        .then(doc => {
            if (!doc.exists) {
                msgDiv.innerHTML = '❌ Usuário não encontrado! Cadastre-se primeiro.';
                msgDiv.style.display = 'block';
                msgDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                msgDiv.style.borderColor = '#ff0000';
                msgDiv.style.color = '#ff0000';
                msgDiv.style.padding = '15px';
                msgDiv.style.marginTop = '15px';
                msgDiv.style.borderRadius = '8px';
                msgDiv.style.fontWeight = 'bold';
                msgDiv.style.border = '2px solid #ff0000';
                return;
            }
            
            const userData = doc.data();
            
            // Verifica senha (SEM CRIPTOGRAFIA)
            if (userData.password !== password) {
                msgDiv.innerHTML = '❌ Senha incorreta!';
                msgDiv.style.display = 'block';
                msgDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                msgDiv.style.borderColor = '#ff0000';
                msgDiv.style.color = '#ff0000';
                msgDiv.style.padding = '15px';
                msgDiv.style.marginTop = '15px';
                msgDiv.style.borderRadius = '8px';
                msgDiv.style.fontWeight = 'bold';
                msgDiv.style.border = '2px solid #ff0000';
                return;
            }
            
            // Login sucesso
            currentUser = username;
            localStorage.setItem('guriUsername', username);
            db.collection("users").doc(username).get().then(doc => {
                const avatar = doc.data().avatarUrl || getDefaultAvatar(); // Fallback para avatar padrão
                localStorage.setItem('guriAvatarUrl', avatar);
                updateAuthUI();
            });
            
            msgDiv.innerHTML = '✅ Acesso liberado, guri!';
            msgDiv.style.display = 'block';
            msgDiv.style.backgroundColor = 'rgba(0, 255, 115, 0.3)';
            msgDiv.style.borderColor = '#00ff73';
            msgDiv.style.color = '#00ff73';
            msgDiv.style.padding = '15px';
            msgDiv.style.marginTop = '15px';
            msgDiv.style.borderRadius = '8px';
            msgDiv.style.fontWeight = 'bold';
            msgDiv.style.border = '2px solid #00ff73';
            
            setTimeout(() => showPage('intro'), 1500);
        })
        .catch(err => {
            msgDiv.innerHTML = '❌ Erro: ' + err.message;
            msgDiv.style.display = 'block';
            msgDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
            msgDiv.style.borderColor = '#ff0000';
            msgDiv.style.color = '#ff0000';
            msgDiv.style.padding = '15px';
            msgDiv.style.marginTop = '15px';
            msgDiv.style.borderRadius = '8px';
            msgDiv.style.fontWeight = 'bold';
            msgDiv.style.border = '2px solid #ff0000';
        })
        .finally(() => {
            btn.disabled = false;
            btn.textContent = 'Entrar';
            
        });
};

// ===========================================
// LÓGICA DO CHAT (FUNÇÕES)
// ===========================================

function loadChat() {
    const chatMessages = document.getElementById('chat-messages');
    
    // Cria e armazena o listener na variável global
    chatUnsubscribe = db.collection("chat")
      .orderBy("createdAt", "asc") 
      .onSnapshot(snapshot => {
        chatMessages.innerHTML = ''; 

        if (!currentUser) {
            chatMessages.innerHTML = '<p class="system-message">Chat do rolê! Você precisa estar logado para enviar mensagens.</p>';
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const newMessage = document.createElement('p');
            newMessage.classList.add('user-message');
            

            
            // Aqui você pode formatar a hora, se desejar
            // const hora = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleTimeString('pt-BR') : '';

            newMessage.innerHTML = `
                <img src="${data.avatarUrl || getDefaultAvatar()}" class="chat-avatar" alt="${data.username}" />
                <p>
                    <strong>${data.username}:</strong> 
                    <span class="chat-msg">${data.message}</span>
                </p>
            `;
            chatMessages.appendChild(newMessage);
        });

        chatMessages.scrollTop = chatMessages.scrollHeight;
      }, 
      error => {
          console.error("Erro ao carregar chat em tempo real:", error);
          chatMessages.innerHTML = '<p class="system-message" style="color: red;">❌ Erro ao carregar mensagens.</p>';
      });
}

function updateChatAccess() {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const isLoggedIn = currentUser !== null; 

    if (isLoggedIn) {
        chatInput.disabled = false;
        sendButton.disabled = false;
        chatInput.placeholder = 'Digite sua mensagem...';
    } else {
        chatInput.disabled = true;
        sendButton.disabled = true;
        chatInput.placeholder = 'Você precisa estar logado para digitar.';
    }
}

function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    
    if (!currentUser || message === '') { 
        return; 
    }

    const username = currentUser.toUpperCase(); 
    // NOVO: Pega o avatar URL do localStorage
    const avatarUrl = localStorage.getItem('guriAvatarUrl') || getDefaultAvatar(); 

    // Adiciona a mensagem ao Firestore
    db.collection("chat").add({
        username: username,
        message: message,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        // NOVO: Salva a URL do avatar
        avatarUrl: avatarUrl
    })
    .then(() => {chatInput.value = '';})
    .catch((err) => {
        console.error("Erro ao enviar mensagem:", err);
        alert("Deu ruim ao enviar mensagem: " + err.message);
    });
}


// ===========================================
// LÓGICA RECADOS (Função centralizada - CORRIGIDO O ACESSO AO LISTENER)
// ===========================================

function loadRecados() {
    const lista = document.getElementById("lista-recados");
    
    // Cria e armazena o listener na variável global
    recadosUnsubscribe = db.collection("recados")
        .orderBy("timestamp", "desc")
        .onSnapshot(snap => {
            lista.innerHTML = "<p style='color:var(--verde);'>🔥 RECADOS DOS GURIS 🔥</p>";
            
            snap.forEach(doc => {
                const d = doc.data();
                const div = document.createElement("div");
                div.className = "recado-item";
                div.innerHTML = `<strong>${d.nome}:</strong> ${d.mensagem}`;
                lista.appendChild(div);
            });
        }, 
        error => {
            console.error("Erro ao carregar recados:", error);
            lista.innerHTML = '<p style="color:red;">❌ Erro ao carregar Recados. Verifique as Regras do Firestore.</p>';
        });
}

document.getElementById("form-recado").onsubmit = (e) => {
    e.preventDefault();
    const nome = document.getElementById("nome").value.trim();
    const msg = document.getElementById("mensagem").value.trim();
    if (!nome || !msg) return alert("Preenche tudo, guri!");

    db.collection("recados").add({
        nome: nome,
        mensagem: msg,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        alert("ZOEIRA ENVIADA COM SUCESSO 🔥");
        e.target.reset();
    })
    .catch((err) => {
        console.error(err);
        alert("Deu ruim: " + err.message);
    });
};

// ===========================================
// CÓDIGO DA CAMISETA (MANTIDO)
// ===========================================

function atualizarCamiseta() {
    const nome = (document.getElementById('nomePersonalizado').value || 'SEU NOME').toUpperCase();
    const numero = document.getElementById('numeroPersonalizado').value || '00';
    document.getElementById('numero-peito').innerText = numero;
    document.getElementById('nome-costas').innerText = nome;
    document.getElementById('numero-costas').innerText = numero;
}

document.getElementById('pedidoForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const nome = document.getElementById('nomeCompleto').value;
    const whats = document.getElementById('whatsapp').value;
    const tam = document.getElementById('tamanho').value;
    const nomePers = (document.getElementById('nomePersonalizado').value || 'Sem').toUpperCase();
    const numPers = document.getElementById('numeroPersonalizado').value || 'Sem';

    const msg = `*PEDIDO 2º LOTE - US GURI*\n\nNome: ${nome}\nWhats: ${whats}\nTamanho: ${tam}\n\nPersonalização:\nNome: ${nomePers}\nNúmero: ${numPers}`;
    const url = `https://wa.me/5549991348038?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    document.getElementById('mensagemSucesso').innerHTML = 'Pedido enviado! Abre o WhatsApp.';
    this.reset();
    setTimeout(() => document.getElementById('mensagemSucesso').innerHTML = '', 5000);
});

function getDefaultAvatar() {
    const randomIndex = Math.floor(Math.random() * AVATAR_URLS.length);
    return AVATAR_URLS[randomIndex];
}

function limitNumberLength(element, max_chars) {
    if (element.value.length > max_chars) {
        element.value = element.value.slice(0, max_chars);
    }
}