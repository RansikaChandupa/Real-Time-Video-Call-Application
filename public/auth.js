let supabase;

document.addEventListener('DOMContentLoaded', main);

async function main(){
    await initializeSupabase();

    if (!supabase) {
        console.error('Supabase failed to initialize');
        return;
    }

    const isIndexPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
    const isLoginPage = window.location.pathname.endsWith('login.html');

    const {data: {user}, error} = await supabase.auth.getUser();

    if (error) {
        console.error('Error getting user:', error);
        if (isIndexPage) {
            window.location.href = '/login.html';
        }
        return;
    }
    if (user && isLoginPage){
        window.location.href = '/index.html';
        console.log("Logged in as", user.email)
    }
    else if(!user && isIndexPage){
        window.location.href = '/login.html';
        console.log("Not logged in")
    }
    if (isLoginPage){
        setupAuthTabs();
        setupAuthForm();
    }
}


async function initializeSupabase() {

    try{
        
        const response = await fetch('http://localhost:3000/api/config');

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const config = await response.json();

        if (!config.supabaseUrl || !config.supabaseKey) {
            throw new Error('Missing supabaseUrl or supabaseKey in config');
        }

        const supabaseUrl = config.supabaseUrl;
        const supabaseKey = config.supabaseKey;

        const { createClient } = await import('@supabase/supabase-js');

        supabase = createClient(supabaseUrl, supabaseKey);
        console.log('Supabase initialized successfully');
        
    }
    catch(error){
        console.error('Failed to initialize Supabase:', error);
        supabase = null;
    }
    
}




function setupAuthTabs(){
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (!loginTab || !signupTab || !loginForm || !signupForm) {
        console.error('Auth tab elements not found');
        return;
    }

    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
    })
    signupTab.addEventListener('click',()=> {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
    })

}

function setupAuthForm(){
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');

    if (!loginForm || !signupForm) {
        console.error('Auth form elements not found');
        return;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try{
            loginError.textContent = "";
            const{data, error} = await supabase.auth.signInWithPassword({email, password});
            if(error)throw error;
            window.location.href = "index.html";
        }
        catch (error){
            console.error("Error while login:",error.message);
            loginError.textContent = error.message || "Failed to log in. Please try again."
        }
    })

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signup-username').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        try{
        signupError.textContent = "";
        const {data, error} = await supabase.auth.signUp({
            email,
            password,
            options:{
                data:{username}
            }
        });
        if(error)throw error;
        if(data.user){
            if(data.session){
                window.location.href = "index.html"
            }
            else{
              signupForm.innerHTML = `
                <div class="success-message"><h3>Registration successful!</h3>
                <p>Please check your email to confirm your account. Before logging in</p>
                <button class="auth-submit" onclick="document.getElementById('login-tab').click()">
                    Go to Login
                </button>
                </div>
              `
            }
        }
        }

        catch(error){
            console.error("Error while signing up:", error.message);
            signupError.textContent = error.message || "Failed to sign up. Please try again"
        }
        });
}

async function logout(){
    try{
        const {error} = await supabase.auth.signOut();
        if(error) throw error;
        window.location.href = "login.html"
    }
    catch(error){
        console.error("Error while logging out:",error.message);
        alert("Failed to logout. Please try again");
    }
}
window.logout = logout;
