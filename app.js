document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Supabase
    const supabaseUrl = 'https://mduvgxdbefqbahlfphfw.supabase.co';
    const supabaseKey = 'sb_publishable_uwIP8jILU7OvcVo7D2MN4A_OZiIhH2s';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    const uploadForm = document.getElementById('upload-form');
    const adminPanel = document.getElementById('admin-panel');
    const buyerPanel = document.getElementById('buyer-panel');
    const verifyBtn = document.getElementById('verify-payment-btn');
    
    // Check URL parameters to see if we are in Buyer Mode
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (productId) {
        // Switch to Buyer UI
        adminPanel.classList.add('hidden');
        buyerPanel.classList.remove('hidden');
        await loadBuyerData(productId);
    } else {
        // Keep Admin UI
        adminPanel.classList.remove('hidden');
        buyerPanel.classList.add('hidden');
    }

    // --- ADMIN: UPLOAD TO DATABASE ---
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

            const { data, error } = await supabase
                .from('products')
                .insert([productData])
                .select();

            if (error) {
                console.error('Error uploading:', error);
                alert('Upload failed. Ensure your Supabase table is created correctly.');
                submitBtn.innerText = "Generate Secure Link";
                submitBtn.disabled = false;
                return;
            }

            // Generate Buyer Link
            const newId = data[0].id;
            const linkContainer = document.getElementById('generated-link-container');
            const shareableLink = document.getElementById('shareable-link');
            
            const currentUrl = window.location.origin + window.location.pathname;
            const finalLink = `${currentUrl}?id=${newId}`;
            
            shareableLink.href = finalLink; 
            shareableLink.innerText = finalLink;
            linkContainer.classList.remove('hidden');
            
            submitBtn.innerText = "Successfully Uploaded!";
        });
    }

    // --- BUYER: FETCH DATA ---
    async function loadBuyerData(id) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            document.getElementById('display-name').innerText = "Product Not Found or Invalid Link";
            return;
        }

        document.getElementById('display-name').innerText = data.name;
        document.getElementById('display-image').src = data.image_url;
        document.getElementById('display-desc').innerText = data.description;
        document.getElementById('display-network').innerText = data.pay_network;
        document.getElementById('display-number').innerText = data.pay_number;
        document.getElementById('display-name-pay').innerText = data.pay_name;
        document.getElementById('display-amount').innerText = data.amount;

        // If admin already verified payment, unlock immediately
        if (data.is_paid) {
            unlockProduct(data.secret_link);
        }
    }

    // --- BUYER: VERIFY PAYMENT BUTTON ---
    if (verifyBtn) {
        verifyBtn.addEventListener('click', async () => {
            verifyBtn.innerText = "Checking Database Status...";
            verifyBtn.style.borderColor = "var(--neon-magenta)";
            verifyBtn.style.color = "var(--neon-magenta)";
            
            const { data, error } = await supabase
                .from('products')
                .select('is_paid, secret_link')
                .eq('id', productId)
                .single();

            if (data && data.is_paid) {
                unlockProduct(data.secret_link);
            } else {
                alert("Payment not verified yet. Please wait for the Admin to confirm the transaction.");
                verifyBtn.innerText = "Check Verification Again";
            }
        });
    }

    function unlockProduct(link) {
        document.querySelector('.payment-box').classList.add('hidden');
        const secretDelivery = document.getElementById('secret-delivery');
        secretDelivery.classList.remove('hidden');
        
        const secretLinkDisplay = document.getElementById('display-secret-link');
        secretLinkDisplay.href = link;
    }
});

