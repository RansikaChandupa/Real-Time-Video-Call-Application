let supabase;


// This will start the main application logic in script.js
function startApp(user) {
    if (window.initializeApp) {
        window.initializeApp(user);
    } else {
        console.error("initializeApp function not found. Make sure script.js is loaded.");
    }
}



document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Failed to fetch config');
        const config = await response.json();
        
        const { createClient } = window.supabase;
        supabase = createClient(config.supabaseUrl, config.supabaseKey, {
            auth: {
                storage: sessionStorage, // Use tab-specific storage
                persistSession: true,
                autoRefreshToken: true
            }
        });
        window.appSupabase = supabase; // Make it globally available

        const isIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
        const isLoginPage = window.location.pathname.endsWith('login.html');

        // Main authentication logic
        supabase.auth.onAuthStateChange((event, session) => {
            const user = session?.user;

            if (user) {
                if (isLoginPage) {
                    window.location.href = '/index.html';
                } else if (isIndexPage) {
                    startApp(user);
                }
            } else {
                if (isIndexPage) {
                    window.location.href = '/login.html';
                }
            }
        });
        
        
        if (isLoginPage) {
            setupAuthTabs();
            setupAuthForm();
        }

    } catch (error) {
        console.error('Initialization failed:', error);
        document.body.innerHTML = '<h2 style="text-align:center; color:red;">Failed to initialize application. See console for details.</h2>';
    }
});

function setupAuthTabs() {
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    if (!loginTab) return;
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
    });
    signupTab.addEventListener('click', () => {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
    });
}

function setupAuthForm() {
    
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const loginError = document.getElementById('login-error');
        try {
            if (loginError) loginError.textContent = "";
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            
        } catch (error) {
            console.error("Login Error:", error.message);
            if (loginError) loginError.textContent = error.message;
        }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signup-username').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const signupError = document.getElementById('signup-error');
        try {
            if (signupError) signupError.textContent = "";
            const { data, error } = await supabase.auth.signUp({
                email, password, options: { data: { username } }
            });
            if (error) throw error;
            if (data.user && !data.session) {
                signupForm.innerHTML = `<div class="success-message"><h3>Registration successful!</h3><p>Please check your email to confirm your account.</p></div>`;
            }
            // The onAuthStateChange listener will handle the redirect if session is created.
        } catch (error) {
            console.error("Signup Error:", error.message);
            if (signupError) signupError.textContent = error.message;
        }
    });
}

async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/login.html';
}
window.logout = logout;