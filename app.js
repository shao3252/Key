document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Supabase
    const supabaseUrl = 'https://mduvgxdbefqbahlfphfw.supabase.co';
    const supabaseKey = 'sb_publishable_uwIP8jILU7OvcVo7D2MN4A_OZiIhH2s';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    const uploadForm = document.getElementById('upload-form');
    const adminPanel = document.getElementById('admin-panel');
    const buyerPanel = document.getElementById('buyer-panel');
    const adminLock = document.getElementById('admin-lock');
    const verifyBtn = document.getElementById('verify-payment-btn');
    
    let secretClicks = 0;

    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (productId) {
        // Buyer Mode: Hide admin and fog, show product
        adminLock.classList.add('hidden');
        adminPanel.classList.add('hidden');
        buyerPanel.classList.remove('hidden');
        await loadBuyerData(productId);
    } else {
        // Home Page: Show ONLY the Encrypted Fog
        adminPanel.classList.add('hidden');
        buyerPanel.classList.add('hidden');
        adminLock.classList.remove('hidden');
    }

    // --- SECRET ADMIN LOCK LOGIC (7 Taps) ---
    if (adminLock) {
        adminLock.addEventListener('click', () => {
            secretClicks++;
            if (secretClicks === 7) {
                adminLock.classList.add('hidden');
                adminPanel.classList.remove('hidden');
                secretClicks = 0; 
            }
        });
    }

    // --- UPLOAD PRODUCT LOGIC ---
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
                console.error('Database Error:', error);
                alert(`Upload Failed: ${error.message}`);
                submitBtn.innerText = "Encrypt & Generate Link";
                submitBtn.disabled = false;
                return;
            }

            const newId = data[0].id;
            const linkContainer = document.getElementById('generated-link-container');
            const shareableLink = document.getElementById('shareable-link');
            
            const currentUrl = window.location.origin + window.location.pathname;
            const finalLink = `${currentUrl}?id=${newId}`;
            
            shareableLink.href = finalLink; 
            shareableLink.innerText = finalLink;
            linkContainer.classList.remove('hidden');
            
            submitBtn.innerText = "Successfully Uploaded!";
            submitBtn.classList.add('success-btn');
        });
    }

    // --- LOAD BUYER DATA LOGIC ---
    async function loadBuyerData(id) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            document.getElementById('display-name').innerText = "Product Not Found or Encrypted.";
            return;
        }

        document.getElementById('display-name').innerText = data.name;
        document.getElementById('display-image').src = data.image_url;
        document.getElementById('display-desc').innerText = data.description;
        document.getElementById('display-network').innerText = data.pay_network;
        document.getElementById('display-number').innerText = data.pay_number;
        document.getElementById('display-name-pay').innerText = data.pay_name;
        document.getElementById('display-amount').innerText = data.amount;

        if (data.is_paid) unlockProduct(data.secret_link);
    }

    // --- VERIFY PAYMENT BUTTON LOGIC ---
    if (verifyBtn) {
        verifyBtn.addEventListener('click', async () => {
            verifyBtn.innerText = "Querying Database...";
            verifyBtn.disabled = true;
            
            const { data, error } = await supabase
                .from('products')
                .select('is_paid, secret_link')
                .eq('id', productId)
                .single();

            if (data && data.is_paid) {
                unlockProduct(data.secret_link);
            } else {
                alert("Transaction pending. The Admin has not verified this payment yet.");
                verifyBtn.innerText = "Check Verification Again";
                verifyBtn.disabled = false;
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
