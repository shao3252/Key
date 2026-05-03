document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Supabase
    const supabaseUrl = 'https://mduvgxdbefqbahlfphfw.supabase.co';
    const supabaseKey = 'sb_publishable_uwIP8jILU7OvcVo7D2MN4A_OZiIhH2s';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    // DOM Elements
    const adminLock = document.getElementById('admin-lock');
    const adminPanel = document.getElementById('admin-panel');
    const buyerPanel = document.getElementById('buyer-panel');
    const loginPanel = document.getElementById('login-panel');
    const dashboardPanel = document.getElementById('dashboard-panel');
    const bgLayer = document.getElementById('bg-layer');
    
    const dashboardIcon = document.getElementById('go-to-dashboard-icon');
    const backToUploadBtn = document.getElementById('back-to-upload-btn');
    const backToUploadFromLogin = document.getElementById('back-to-upload-from-login');
    const logoutBtn = document.getElementById('logout-btn');
    const adminList = document.getElementById('admin-list');
    
    // Stats
    const statTotal = document.getElementById('stat-total');
    const statPending = document.getElementById('stat-pending');
    const statVerified = document.getElementById('stat-verified');

    let secretClicks = 0;
    const MASTER_PIN = "2026"; 
    let currentPinEntry = "";

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    function hideAllPanels() {
        adminLock.classList.add('hidden');
        adminPanel.classList.add('hidden');
        buyerPanel.classList.add('hidden');
        loginPanel.classList.add('hidden');
        dashboardPanel.classList.add('hidden');
    }

    if (productId) {
        hideAllPanels();
        buyerPanel.classList.remove('hidden');
        loadBuyerData(productId);
    } else {
        hideAllPanels();
        adminLock.classList.remove('hidden');
    }

    // --- SECRET 7-TAP LOCK ---
    if (adminLock) {
        adminLock.addEventListener('click', () => {
            secretClicks++;
            if (secretClicks === 7) {
                hideAllPanels();
                adminPanel.classList.remove('hidden');
                secretClicks = 0; 
            }
        });
    }

    // --- NAVIGATION ---
    if (dashboardIcon) {
        dashboardIcon.addEventListener('click', () => {
            hideAllPanels();
            loginPanel.classList.remove('hidden');
            resetPinPad();
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

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            hideAllPanels();
            loginPanel.classList.remove('hidden');
            resetPinPad();
        });
    }

    // --- PIN PAD LOGIC ---
    const pinButtons = document.querySelectorAll('.pin-btn:not(#pin-clear):not(#back-to-upload-from-login)');
    const pinClearBtn = document.getElementById('pin-clear');
    const pinDots = document.querySelectorAll('.pin-dot');

    pinButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentPinEntry.length < 4) {
                currentPinEntry += btn.innerText;
                updatePinDisplay();
                if (currentPinEntry.length === 4) verifyPin();
            }
        });
    });

    if (pinClearBtn) {
        pinClearBtn.addEventListener('click', () => resetPinPad());
    }

    function updatePinDisplay() {
        pinDots.forEach((dot, index) => {
            if (index < currentPinEntry.length) dot.classList.add('filled');
            else dot.classList.remove('filled', 'error');
        });
    }

    function resetPinPad() {
        currentPinEntry = "";
        pinDots.forEach(dot => dot.classList.remove('filled', 'error'));
    }

    function verifyPin() {
        if (currentPinEntry === MASTER_PIN) {
            setTimeout(() => {
                hideAllPanels();
                dashboardPanel.classList.remove('hidden');
                fetchRequests();
                resetPinPad();
            }, 300);
        } else {
            pinDots.forEach(dot => dot.classList.add('error'));
            setTimeout(() => resetPinPad(), 600);
        }
    }

    // --- UPLOAD LOGIC ---
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = uploadForm.querySelector('button');
            const imageFile = document.getElementById('product-image').files[0];
            
            if (!imageFile) {
                alert("Please select an image.");
                return;
            }

            submitBtn.innerText = "Uploading Media...";
            submitBtn.disabled = true;

            try {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `premium_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, imageFile);
                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
                const finalImageUrl = publicUrlData.publicUrl;

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
                alert(`Upload Failed: ${error.message}`);
                submitBtn.innerText = "Encrypt & Generate Link";
                submitBtn.disabled = false;
            }
        });
    }

    // --- DASHBOARD LOGIC ---
    async function fetchRequests() {
        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });

        if (error) {
            adminList.innerHTML = `<p class="neon-text-sub">Error: ${error.message}</p>`;
            return;
        }

        if (data.length === 0) {
            adminList.innerHTML = `<p>No records found.</p>`;
            statTotal.innerText = "0"; statPending.innerText = "0"; statVerified.innerText = "0";
            return;
        }

        statTotal.innerText = data.length;
        statPending.innerText = data.filter(item => !item.is_paid).length;
        statVerified.innerText = data.filter(item => item.is_paid).length;

        let html = '<table class="admin-table">';
        html += '<tr><th>Product Name</th><th>Price</th><th>Status</th><th>Action</th></tr>';

        data.forEach(item => {
            const statusText = item.is_paid ? 
                '<span style="color: var(--neon-green); font-weight: bold;">VERIFIED</span>' : 
                '<span style="color: var(--neon-magenta); font-weight: bold;">PENDING</span>';
            
            const actionBtn = item.is_paid ? 
                '<span style="color: #555;">Locked</span>' : 
                `<button onclick="approvePayment('${item.id}')" class="neon-btn" style="padding: 8px 12px; margin: 0; font-size: 12px; box-shadow: none;">Approve</button>`;

            html += `<tr><td>${item.name}</td><td>TZS ${item.amount}</td><td>${statusText}</td><td>${actionBtn}</td></tr>`;
        });
        html += '</table>';
        adminList.innerHTML = html;
    }

    window.approvePayment = async (id) => {
        const { error } = await supabase.from('products').update({ is_paid: true }).eq('id', id);
        if (error) alert(`Error: ${error.message}`);
        else fetchRequests(); 
    };

    // --- BUYER VIEW LOGIC ---
    async function loadBuyerData(id) {
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();

        if (error || !data) {
            document.getElementById('display-name').innerText = "Bidhaa Haipatikani.";
            return;
        }

        if (bgLayer) bgLayer.style.backgroundImage = `url('${data.image_url}')`;

        document.getElementById('display-name').innerText = data.name;
        document.getElementById('display-desc').innerText = data.description;
        document.getElementById('display-network').innerText = data.pay_network;
        document.getElementById('display-number').innerText = data.pay_number;
        document.getElementById('display-name-pay').innerText = data.pay_name;
        document.getElementById('display-amount').innerText = data.amount;

        if (data.is_paid) unlockProduct(data.secret_link);
    }

    // --- SINGLE-USE TOKEN (AUTO-LOCK) LOGIC ---
    const verifyBtn = document.getElementById('verify-payment-btn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', async () => {
            verifyBtn.innerText = "Inahakiki Database...";
            verifyBtn.disabled = true;
            
            const { data } = await supabase.from('products').select('is_paid, secret_link').eq('id', productId).single();

            if (data && data.is_paid) {
                unlockProduct(data.secret_link);
                // Auto-lock the database entry instantly
                await supabase.from('products').update({ is_paid: false }).eq('id', productId);
            } else {
                alert("Muamala bado unasubiri. Admin bado hajahakiki malipo haya.");
                verifyBtn.innerText = "Bonyeza hapa kama umeshalipia";
                verifyBtn.disabled = false;
            }
        });
    }

    function unlockProduct(link) {
        document.querySelector('.buyer-payment-box').classList.add('hidden');
        const secretDelivery = document.getElementById('secret-delivery');
        secretDelivery.classList.remove('hidden');
        document.getElementById('display-secret-link').href = link;
    }
});
