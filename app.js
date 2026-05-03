document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Premium Supabase Connection
    const supabaseUrl = 'https://mduvgxdbefqbahlfphfw.supabase.co';
    const supabaseKey = 'sb_publishable_uwIP8jILU7OvcVo7D2MN4A_OZiIhH2s';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    // 2. DOM Elements Mapping
    const adminLock = document.getElementById('admin-lock');
    const adminPanel = document.getElementById('admin-panel');
    const buyerPanel = document.getElementById('buyer-panel');
    const loginPanel = document.getElementById('login-panel');
    const dashboardPanel = document.getElementById('dashboard-panel');
    const bgLayer = document.getElementById('bg-layer'); // Dynamic Background
    
    // Navigation & Action Buttons
    const dashboardIcon = document.getElementById('go-to-dashboard-icon');
    const backToUploadBtn = document.getElementById('back-to-upload-btn');
    const backToUploadFromLogin = document.getElementById('back-to-upload-from-login');
    const logoutBtn = document.getElementById('logout-btn');
    const adminList = document.getElementById('admin-list');
    
    let secretClicks = 0;

    // --- CORE ROUTING ENGINE ---
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    function hideAllPanels() {
        adminLock.classList.add('hidden');
        adminPanel.classList.add('hidden');
        buyerPanel.classList.add('hidden');
        loginPanel.classList.add('hidden');
        dashboardPanel.classList.add('hidden');
    }

    // Determine initial view based on URL parameters
    if (productId) {
        hideAllPanels();
        buyerPanel.classList.remove('hidden');
        loadBuyerData(productId);
    } else {
        hideAllPanels();
        adminLock.classList.remove('hidden');
    }

    // --- THE 7-TAP SECRET LOCK ---
    if (adminLock) {
        adminLock.addEventListener('click', () => {
            secretClicks++;
            if (secretClicks === 7) {
                hideAllPanels();
                adminPanel.classList.remove('hidden');
                secretClicks = 0; // Reset counter
            }
        });
    }

    // --- ADMIN SYSTEM NAVIGATION ---
    if (dashboardIcon) {
        dashboardIcon.addEventListener('click', async () => {
            hideAllPanels();
            // Verify if a secure session already exists
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                dashboardPanel.classList.remove('hidden');
                fetchRequests();
            } else {
                loginPanel.classList.remove('hidden');
            }
        });
    }

    if (backToUploadBtn) {
        backToUploadBtn.addEventListener('click', () => {
            hideAllPanels();
            adminPanel.classList.remove('hidden');
        });
    }

    if (backToUploadFromLogin) {
        backToUploadFromLogin.addEventListener('click', () => {
            hideAllPanels();
            adminPanel.classList.remove('hidden');
        });
    }

    // --- MASTER AUTHENTICATION (LOGIN/LOGOUT) ---
    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-password').value;
            const loginBtn = document.getElementById('login-btn');

            loginBtn.innerText = "Authenticating...";
            loginBtn.disabled = true;

            const { error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                alert(`Authentication Failed: ${error.message}`);
                loginBtn.innerText = "Authenticate";
                loginBtn.disabled = false;
            } else {
                document.getElementById('admin-password').value = '';
                loginBtn.innerText = "Authenticate";
                loginBtn.disabled = false;
                hideAllPanels();
                dashboardPanel.classList.remove('hidden');
                fetchRequests();
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            hideAllPanels();
            loginPanel.classList.remove('hidden');
        });
    }

    // --- REAL IMAGE UPLOAD & ENCRYPTION ENGINE ---
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = uploadForm.querySelector('button');
            const imageFile = document.getElementById('product-image').files[0];
            
            if (!imageFile) {
                alert("Please select a product image from your gallery.");
                return;
            }

            submitBtn.innerText = "Uploading Media...";
            submitBtn.disabled = true;

            try {
                // 1. Upload the physical image to Supabase Storage
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `premium_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(fileName, imageFile);

                if (uploadError) throw uploadError;

                // 2. Retrieve the public URL for the newly uploaded image
                const { data: publicUrlData } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(fileName);

                const finalImageUrl = publicUrlData.publicUrl;

                // 3. Insert all data into the Supabase PostgreSQL Database
                submitBtn.innerText = "Encrypting Data...";
                
                const productData = {
                    name: document.getElementById('product-name').value,
                    image_url: finalImageUrl,
                    description: document.getElementById('product-desc').value,
                    pay_network: document.getElementById('pay-network').value,
                    pay_number: document.getElementById('pay-number').value,
                    pay_name: document.getElementById('pay-name').value,
                    amount: document.getElementById('pay-amount').value,
                    secret_link: document.getElementById('product-link').value,
                    is_paid: false
                };

                const { data, error: dbError } = await supabase.from('products').insert([productData]).select();

                if (dbError) throw dbError;

                // 4. Generate the secure unique link for the buyer
                const newId = data[0].id;
                const currentUrl = window.location.origin + window.location.pathname;
                const finalLink = `${currentUrl}?id=${newId}`;
                
                const shareableLink = document.getElementById('shareable-link');
                shareableLink.href = finalLink; 
                shareableLink.innerText = finalLink;
                document.getElementById('generated-link-container').classList.remove('hidden');
                
                submitBtn.innerText = "Successfully Uploaded!";
                submitBtn.classList.add('success-btn');

            } catch (error) {
                alert(`Upload Process Failed: ${error.message}`);
                submitBtn.innerText = "Encrypt & Generate Link";
                submitBtn.disabled = false;
            }
        });
    }

    // --- DASHBOARD: REAL-TIME APPROVAL LOGIC ---
    async function fetchRequests() {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            adminList.innerHTML = `<p class="neon-text-sub">Error Fetching Data: ${error.message}</p>`;
            return;
        }

        if (data.length === 0) {
            adminList.innerHTML = `<p>No secure records found in the database.</p>`;
            return;
        }

        let html = '<table class="admin-table">';
        html += '<tr><th>Product Name</th><th>Price</th><th>Status</th><th>Action</th></tr>';

        data.forEach(item => {
            const statusText = item.is_paid ? 
                '<span style="color: var(--neon-green); font-weight: bold;">VERIFIED</span>' : 
                '<span style="color: var(--neon-magenta); font-weight: bold;">PENDING</span>';
            
            const actionBtn = item.is_paid ? 
                '<span style="color: #555;">Locked (Waiting for User)</span>' : 
                `<button onclick="approvePayment('${item.id}')" class="neon-btn" style="padding: 8px 12px; margin: 0; font-size: 12px; border-color: var(--neon-green); color: var(--neon-green); box-shadow: none;">Approve</button>`;

            html += `<tr><td>${item.name}</td><td>${item.amount}</td><td>${statusText}</td><td>${actionBtn}</td></tr>`;
        });
        html += '</table>';
        adminList.innerHTML = html;
    }

    // Expose approvePayment globally for the inline HTML onclick
    window.approvePayment = async (id) => {
        const { error } = await supabase.from('products').update({ is_paid: true }).eq('id', id);
        if (error) {
            alert(`Database Error: ${error.message}`);
        } else {
            fetchRequests(); // Refresh the table
        }
    };

    // --- BUYER VIEW LOGIC ---
    async function loadBuyerData(id) {
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();

        if (error || !data) {
            document.getElementById('display-name').innerText = "Product Not Found or Encrypted.";
            return;
        }

        // Apply the premium dynamic background image
        if (bgLayer) {
            bgLayer.style.backgroundImage = `url('${data.image_url}')`;
        }

        document.getElementById('display-name').innerText = data.name;
        document.getElementById('display-desc').innerText = data.description;
        document.getElementById('display-network').innerText = data.pay_network;
        document.getElementById('display-number').innerText = data.pay_number;
        document.getElementById('display-name-pay').innerText = data.pay_name;
        document.getElementById('display-amount').innerText = data.amount;

        if (data.is_paid) unlockProduct(data.secret_link);
    }

    // --- THE SINGLE-USE TOKEN (BURN-AFTER-READING) LOGIC ---
    const verifyBtn = document.getElementById('verify-payment-btn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', async () => {
            verifyBtn.innerText = "Querying Database...";
            verifyBtn.disabled = true;
            
            // 1. Check if Admin has approved this specific link
            const { data } = await supabase.from('products').select('is_paid, secret_link').eq('id', productId).single();

            if (data && data.is_paid) {
                // 2. Unlock the product for the buyer
                unlockProduct(data.secret_link);

                // 3. PREMIUM SECURITY: Instantly Auto-Lock the database entry
                // This changes is_paid back to false so the link cannot be reused or shared!
                await supabase.from('products').update({ is_paid: false }).eq('id', productId);

            } else {
                alert("Transaction pending. The Admin has not verified this payment yet. Please ensure you have sent the funds and try again.");
                verifyBtn.innerText = "Check Verification Again";
                verifyBtn.disabled = false;
            }
        });
    }

    function unlockProduct(link) {
        document.querySelector('.payment-box').classList.add('hidden');
        const secretDelivery = document.getElementById('secret-delivery');
        secretDelivery.classList.remove('hidden');
        document.getElementById('display-secret-link').href = link;
    }
});
