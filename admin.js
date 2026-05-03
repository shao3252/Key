document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Supabase
    const supabaseUrl = 'https://mduvgxdbefqbahlfphfw.supabase.co';
    const supabaseKey = 'sb_publishable_uwIP8jILU7OvcVo7D2MN4A_OZiIhH2s';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    const adminList = document.getElementById('admin-list');

    // Fetch all products
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
            adminList.innerHTML = `<p>No records found in the database.</p>`;
            return;
        }

        let html = '<table class="admin-table">';
        html += '<tr><th>Product Name</th><th>Price</th><th>Status</th><th>Action</th></tr>';

        data.forEach(item => {
            const statusText = item.is_paid ? 
                '<span style="color: var(--neon-green); font-weight: bold;">VERIFIED</span>' : 
                '<span style="color: var(--neon-magenta); font-weight: bold;">PENDING</span>';
            
            const actionBtn = item.is_paid ? 
                '<span style="color: #555;">Locked</span>' : 
                `<button onclick="approvePayment('${item.id}')" class="neon-btn" style="padding: 8px 12px; margin: 0; font-size: 12px; border-color: var(--neon-green); color: var(--neon-green); box-shadow: none;">Approve</button>`;

            html += `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.amount}</td>
                    <td>${statusText}</td>
                    <td>${actionBtn}</td>
                </tr>
            `;
        });
        html += '</table>';
        adminList.innerHTML = html;
    }

    // Master function to approve the payment
    window.approvePayment = async (id) => {
        // Give visual feedback immediately
        const { error } = await supabase
            .from('products')
            .update({ is_paid: true })
            .eq('id', id);

        if (error) {
            alert(`Database Error: ${error.message}`);
        } else {
            // Re-fetch the list to show the updated status
            fetchRequests();
        }
    };

    // Run on load
    fetchRequests();
});
