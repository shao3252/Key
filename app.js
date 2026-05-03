document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Premium Supabase Connection
    const supabaseUrl = 'https://mduvgxdbefqbahlfphfw.supabase.co';
    const supabaseKey = 'sb_publishable_uwIP8jILU7OvcVo7D2MN4A_OZiIhH2s';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    const uploadForm = document.getElementById('upload-form');
    const adminPanel = document.getElementById('admin-panel');
    const buyerPanel = document.getElementById('buyer-panel');
    const verifyBtn = document.getElementById('verify-payment-btn');
    
    // 2. Smart Routing: Detect if URL has an ID for Buyer Mode
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (productId) {
        // Enter Buyer Mode
        adminPanel.classList.add('hidden');
        buyerPanel.classList.remove('hidden');
        await loadBuyerData(productId);
    } else {
        // Enter Admin Mode
        adminPanel.classList.remove('hidden');
        buyerPanel.classList.add('hidden');
    }

    // --- ADMIN SECURE UPLOAD LOGIC ---
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = uploadForm.querySelector('button');
            submitBtn.innerText = "Encrypting & Uploading...";
            submitBtn.disabled = true;

            const productData = {
                name: document.getElementById('product-name').value,
                image_url: document.getElementById('product-image').value,
                description: document.getElementById('product-desc').value,
                pay_network: document.getElementById('pay-network').value,
                pay_number: document.getElementById('pay-number').value,
                pay_name: document.getElementById('pay-name').value,
                amount: document.getElementById('pay-amount').value,
                secret_link: document.getElementById('product-link').value,
                is_paid: false
            };

            // Push to Supabase Database
            const { data, error } = await supabase
                .from('products')
                .insert([productData])
                .select();

            // Advanced Debugging Protocol: Exposes exact database failures
            if (error) {
                console.error('Database Error:', error);
                alert(`SUPABASE ERROR:\nMessage: ${error.message || 'Unknown Error'}\nDetails: ${error.details || 'None'}\nHint: ${error.hint || 'Check your database RLS policies.'}`);
                submitBtn.innerText = "Generate Secure Link";
                submitBtn.disabled = false;
                return;
            }

            // Success: Generate Unique Buyer Link
            const newId = data[0].id;
            const linkContainer = document.getElementById('generated-link-container');
            const shareableLink = document.getElementById('shareable-link');
            
            const currentUrl = window.location.origin + window.location.pathname;
            const finalLink = `${currentUrl}?id=${newId}`;
            
            shareableLink.href = finalLink; 
            shareableLink.innerText = finalLink;
            linkContainer.classList.remove('hidden');
            
            // Visual feedback on success
            submitBtn.innerText = "Successfully Uploaded!";
            submitBtn.style.color = "var(--neon-green)";
            submitBtn.style.borderColor = "var(--neon-green)";
            submitBtn.style.boxShadow = "0 0 15px var(--neon-green) inset, 0 0 15px var(--neon-green)";
        });
    }

    // --- BUYER DATA FETCH LOGIC ---
    async function loadBuyerData(id) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            document.getElementById('display-name').innerText = "Product Not Found or Link Expired";
            return;
        }

        // Render Data to Premium UI
        document.getElementById('display-name').innerText = data.name;
        document.getElementById('display-image').src = data.image_url;
        document.getElementById('display-desc').innerText = data.description;
        document.getElementById('display-network').innerText = data.pay_network;
        document.getElementById('display-number').innerText = data.pay_number;
        document.getElementById('display-name-pay').innerText = data.pay_name;
        document.getElementById('display-amount').innerText = data.amount;

        // Auto-Unlock if already verified by Admin
        if (data.is_paid) {
            unlockProduct(data.secret_link);
        }
    }

    // --- PAYMENT VERIFICATION LOGIC ---
    if (verifyBtn) {
        verifyBtn.addEventListener('click', async () => {
            // Visual loading state
            verifyBtn.innerText = "Querying Database...";
            verifyBtn.style.borderColor = "var(--neon-magenta)";
            verifyBtn.style.color = "var(--neon-magenta)";
            verifyBtn.style.boxShadow = "0 0 15px var(--neon-magenta) inset, 0 0 15px var(--neon-magenta)";
            verifyBtn.disabled = true;
            
            const { data, error } = await supabase
                .from('products')
                .select('is_paid, secret_link')
                .eq('id', productId)
                .single();

            if (data && data.is_paid) {
                unlockProduct(data.secret_link);
            } else {
                alert("Transaction pending. The Admin has not verified this payment yet. Please ensure you have sent the funds and try again shortly.");
                
                // Reset button state
                verifyBtn.innerText = "Check Verification Again";
                verifyBtn.disabled = false;
                verifyBtn.style.borderColor = "var(--neon-cyan)";
                verifyBtn.style.color = "var(--neon-cyan)";
                verifyBtn.style.boxShadow = "0 0 10px var(--neon-cyan) inset, 0 0 10px var(--neon-cyan)";
            }
        });
    }

    // --- ASSET DELIVERY LOGIC ---
    function unlockProduct(link) {
        document.querySelector('.payment-box').classList.add('hidden');
        const secretDelivery = document.getElementById('secret-delivery');
        secretDelivery.classList.remove('hidden');
        
        const secretLinkDisplay = document.getElementById('display-secret-link');
        secretLinkDisplay.href = link;
    }
});
