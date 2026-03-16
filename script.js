const API_URL = "http://192.168.0.102:8000"; 

// ---- 1. AUTHENTICATION ----
async function handleLogin(e) {
    e.preventDefault();
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    
    try {
        // ยิง API Login
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: new URLSearchParams({username: u, password: p})
        });

        if(!res.ok) throw new Error("Login failed");
        const data = await res.json();
        
        // เก็บ Token
        localStorage.setItem('token', data.access_token);
        // รีโหลดเพื่อเข้าหน้า Dashboard
        window.location.reload();

    } catch(err) {
        Swal.fire({
            title: 'ผิดพลาด!',
            text: 'User หรือ Password ผิดพลาด',
            icon: 'error',
            confirmButtonText: 'ตกลง',
            confirmButtonColor: '#3b82f6'
        });
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.reload();
}

// ---- 2. INITIALIZATION ----
window.onload = async () => {
    const token = localStorage.getItem('token');
    if(!token) return; 

    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');

    try {
        const res = await fetch(`${API_URL}/users/me`, {
            headers: {'Authorization': `Bearer ${token}`}
        });
        
        if(!res.ok) throw new Error("Token expired");
        const user = await res.json();

        // 🔍 DEBUG: ดูค่าที่ได้จาก API จริงๆ (กด F12 ดู Console)
        console.log("User Data from API:", user); 

        // แสดงชื่อ
        document.getElementById('user-display-name').innerText = user.username;
        
        // ถ้าไม่มี Role_name ส่งมา ให้เดาจาก ID เอา
        let r_id = user.role_id; 
        
        // Mapping ชื่อ Role เพื่อแสดงผล
        let r_name = "Unknown";
        if(r_id == 1) r_name = "Admin";
        else if(r_id == 2) r_name = "Employee";
        else if(r_id == 3) r_name = "CEO";
        
        document.getElementById('user-display-role').innerText = r_name;

        // เช็ค Role เพื่อเปิดเมนู
        checkRole(r_id); 

    } catch(err) {
        console.error("Auth Error:", err);
        logout();
    }
};

function checkRole(roleId) {
    // ซ่อนเมนูทั้งหมดก่อน
    document.getElementById('menu-admin').classList.add('hidden');
    document.getElementById('menu-employee').classList.add('hidden');
    document.getElementById('menu-ceo').classList.add('hidden');

    // แปลงเป็นตัวเลขให้ชัวร์ (เผื่อมาเป็น String)
    const id = parseInt(roleId);

    if (id === 1) {
        // === ADMIN ===
        console.log("Welcome Admin!");
        document.getElementById('menu-admin').classList.remove('hidden');
        showPage('admin-user'); // เปิดหน้าแรกของ Admin
    } 
    else if (id === 2) {
        // === EMPLOYEE ===
        console.log("Welcome Employee!");
        document.getElementById('menu-employee').classList.remove('hidden');
        showPage('emp-list-bill'); // เปิดหน้าแรกของ Employee
        loadDropdowns(); // โหลดข้อมูลรถรอไว้เลย
    } 
    else if (id === 3) {
        // === CEO ===
        console.log("Welcome CEO!");
        document.getElementById('menu-ceo').classList.remove('hidden');
        showPage('ceo-page'); 
        
        loadCEOCharts(); // วาดกราฟ
        
        // 🚨 เพิ่มบรรทัดนี้: โหลดตาราง View ทันทีที่เข้าสู่ระบบเป็น CEO
        fetchAndDisplayView(); 
    }
    else {
        alert("Role ของคุณไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ");
        logout();
    }
}

// ---- 3. NAVIGATION ----
function showPage(pageId) {
    // ซ่อนทุกหน้า
    document.querySelectorAll('.page-content').forEach(el => el.classList.add('hidden'));
    // โชว์หน้าที่เลือก
    document.getElementById(pageId).classList.remove('hidden');
    
    // Highlight ปุ่มเมนู (Optional styling logic here)
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('bg-slate-700', 'border-l-4', 'border-blue-500'));
    
    // โหลดข้อมูลตามหน้า
    if(pageId === 'admin-emp') loadAdminData('employees');
    if(pageId === 'admin-vehicle') loadAdminData('vehicles');
    if(pageId === 'admin-user') loadAdminData('users');
    if(pageId === 'admin-product') loadAdminData('products');

    if(pageId === 'emp-list-bill') loadBills();
}

// ---- 4. ADMIN FUNCTIONS ----
async function loadAdminData(type) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/${type}/`, { headers: {'Authorization': `Bearer ${token}`} });
        if(!res.ok) {console.error(`ไม่สามารถโหลดข้อมูล ${type} ได้`);
            return;
        }
        const data = await res.json();
        console.log(`[DEBUG] ข้อมูล ${type} ที่ได้จาก API:`, data);
        
        let html = '';
        if(type === 'employees') {
            html = data.map(e => `
                <tr class="hover:bg-gray-50 border-b">
                    <td class="p-4 font-mono">${e.id}</td>
                    <td class="p-4 font-bold text-gray-700">${e.name}</td>
                    <td class="p-4 text-gray-600">-</td>
                    <td class="p-4"><span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">${e.work_status || 'Active'}</span></td>
                    <td class="p-4 text-right">
                        <button onclick="deleteData('employees', ${e.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm shadow-sm transition">
                            <i class="fas fa-trash"></i> ลบ
                        </button>
                    </td>
                </tr>`).join('');
            document.getElementById('table-emps').innerHTML = html;
        }
        else if(type === 'vehicles') {
                console.log("Vehicle Data from API:", data); 

                html = data.map(v => {
                    const id = v.id;
                    const plate = v.name || "-";
                    const desc = v.description || "-"; 

                    return `
                    <tr class="hover:bg-gray-50 border-b">
                        <td class="p-4 font-mono">${id}</td>
                        <td class="p-4">
                            <div class="font-bold text-blue-900">${plate}</div>
                            <div class="text-xs text-gray-500">${desc}</div> 
                        </td>
                        <td class="p-4">
                            <span class="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                Active
                            </span>
                        </td>
                        <td class="p-4 text-right">
                            <button onclick="deleteData('vehicles', ${id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm shadow-sm transition">
                                <i class="fas fa-trash"></i> ลบ
                            </button>
                        </td>
                    </tr>`;
                }).join('');
                document.getElementById('table-vehs').innerHTML = html;
            }
        else if(type === 'users') {
            html = data.map(u => `
                <tr class="hover:bg-gray-50 border-b">
                    <td class="p-4 font-mono">${u.id}</td>
                    <td class="p-4 font-bold">${u.username}</td>
                    <td class="p-4 text-sm text-gray-500">${u.role_id === 1 ? 'Admin' : (u.role_id === 3 ? 'CEO' : 'Employee')}</td>
                    <td class="p-4"><span class="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">Active</span></td>
                    <td class="p-4 text-right">
                        <button onclick="deleteData('users', ${u.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm shadow-sm transition">
                            <i class="fas fa-trash"></i> ลบ
                        </button>
                    </td>
                </tr>`).join('');
            document.getElementById('table-users').innerHTML = html;
        }
        else if(type === 'products') {
            if (data.length === 0) {
                document.getElementById('grid-products').innerHTML = `<p class="col-span-full text-center text-gray-500 py-8">ยังไม่มีข้อมูลสินค้าในระบบ</p>`;
                return;
            }

            html = data.map(p => {
                // 🚨 แก้จุดที่ 2: แปลงค่าเป็น Number ป้องกัน Error กรณี Database ส่งค่า Null มา
                const price = Number(p.unit_price || 0);
                const qty = Number(p.stock_qty || 0);
                const name = p.name || 'ไม่ได้ระบุชื่อสินค้า';

                return `
                <tr class="hover:bg-gray-50 border-b">
                    <td class="p-4 font-mono text-gray-500">${p.id}</td>
                    <td class="p-4 font-bold text-gray-800">${name}</td>
                    <td class="p-4 text-blue-600 font-medium">${price.toLocaleString('th-TH')} ฿</td>
                    <td class="p-4">
                        <span class="px-2 py-1 rounded text-xs font-bold ${qty < 100 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">
                            ${qty.toLocaleString('th-TH')} ชิ้น
                        </span>
                    </td>
                    <td class="p-4 text-right">
                        <button onclick="deleteData('products', ${p.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm shadow-sm transition">
                            <i class="fas fa-trash"></i> ลบ
                        </button>
                    </td>
                </tr>`;
            }).join('');
            document.getElementById('table-products').innerHTML = html;
        }

    } catch(e) { console.error("Load Error:", e); }
}

async function adminCreateEmp(e) {
    e.preventDefault();
    const empName = document.getElementById('emp_name').value;
    const empPhone = document.getElementById('emp_phone').value;
    
    if (empPhone.length !== 10) {
        Swal.fire({
            title: 'เบอร์โทรศัพท์ไม่ถูกต้อง',
            text: 'กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก',
            icon: 'warning',
            confirmButtonColor: '#f59e0b'
        });
        return; 
    }
    const body = {
        name: empName,         
        work_status: "Active"
    };

    try {
        await sendPost('/employees', body);
        Swal.fire({
            title: 'สำเร็จ!',
            text: 'เพิ่มพนักงานใหม่เรียบร้อยแล้ว',
            icon: 'success',
            confirmButtonText: 'ตกลง',
            confirmButtonColor: '#3b82f6'
        });
        loadAdminData('employees');

    } catch (err) {}
}

async function adminCreateVehicle(e) {
    e.preventDefault();
    const veh_plate = document.getElementById('veh_plate').value;
    if (!veh_plate) {
        Swal.fire({
            title: 'แจ้งเตือน',
            text: 'กรุณากรอกทะเบียนรถ',
            icon: 'warning',
            confirmButtonColor: '#f59e0b'
        });
        return;
    }
    const body = {
        name: veh_plate,
        description: document.getElementById('veh_desc').value
    };
    
    try {
        await sendPost('/vehicles', body);
        Swal.fire({
            title: 'สำเร็จ!',
            text: 'เพิ่มยานพาหนะเรียบร้อยแล้ว',
            icon: 'success',
            confirmButtonColor: '#3b82f6'
        });
        loadAdminData('vehicles');

    } catch (err) {
        console.error(err);
    }
}

async function adminCreateUser(e) {
    e.preventDefault();
    
    const empId = parseInt(document.getElementById('new_u_empid').value);
    const roleId = parseInt(document.getElementById('new_u_role').value);
    
    if(isNaN(empId)) { alert("กรุณาใส่รหัสพนักงานเป็นตัวเลข"); return; }

    try {
            const token = localStorage.getItem('token');
            const resUsers = await fetch(`${API_URL}/users/`, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            const currentUsers = await resUsers.json();

            // ตรวจสอบว่า Employee_id นี้มีในระบบแล้วหรือยัง
            const isDuplicate = currentUsers.some(u => u.employee_id === empId);
            
            if (isDuplicate) {
                Swal.fire({
                    title: '❌ ข้อมูลซ้ำ!',
                    text: `รหัสพนักงาน ${empId} มีบัญชีผู้ใช้งานอยู่แล้วในระบบ`,
                    icon: 'warning', 
                    confirmButtonText: 'ตกลง',
                    confirmButtonColor: '#f59e0b' 
                });
                return; 
            }

        } catch (err) {
            console.error("เช็คข้อมูลซ้ำไม่ได้:", err);
        }

    const body = {
        username: document.getElementById('new_u_name').value,
        password: document.getElementById('new_u_pass').value,
        role_id: roleId,
        employee_id: empId
    };
    try {
        await sendPost('/users', body);
            Swal.fire({
                title: 'สำเร็จ!',
                text: 'เพิ่มบัญชีผู้ใช้ใหม่เรียบร้อยแล้ว',
                icon: 'success',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#3b82f6' 
            });
            loadAdminData('users');
    } catch (error) {
        console.error("สร้าง User ไม่สำเร็จ:", error);
    }
}

async function adminCreateProduct(e) {
    e.preventDefault(); 

    const name = document.getElementById('product_name').value;
    const qty = document.getElementById('quantity').value;
    const price = document.getElementById('product_price').value;

    const token = localStorage.getItem('token'); 

    try {
        const res = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                name: name,
                stock_qty: parseInt(qty), 
                unit_price: parseInt(price)
            })
        });
        
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || "ไม่สามารถเพิ่มสินค้าได้");
        }

        Swal.fire({
            title: 'สำเร็จ!',
            text: 'เพิ่มสินค้าลงฐานข้อมูลเรียบร้อยแล้ว',
            icon: 'success',
            confirmButtonColor: '#3b82f6'
        }).then(() => {
            document.getElementById('addProductForm').reset();
        });

    } catch(err) {
        Swal.fire({
            title: 'ผิดพลาด!',
            text: err.message,
            icon: 'error',
            confirmButtonColor: '#ef4444'
        });
    }
}


// ---- 5. EMPLOYEE FUNCTIONS ----
async function loadDropdowns() {
    const token = localStorage.getItem('token');
    try {
        const [resV, resU , resE] = await Promise.all([
            fetch(`${API_URL}/vehicles/`, { headers: {'Authorization': `Bearer ${token}`} }),
            fetch(`${API_URL}/users/`, { headers: {'Authorization': `Bearer ${token}`} }),
            fetch(`${API_URL}/employees/`, { headers: {'Authorization': `Bearer ${token}`}})
        ]);
        const vehs = await resV.json();
        const user = await resU.json();
        const emp = await resE.json();
        
        document.getElementById('bill_vehicle').innerHTML = vehs.map(v => {
            const id = v.id;
            const plate = v.name;
            const desc = v.description || "";
            const displayName = desc ? `${plate} (${desc})` : plate;
            return `<option value="${id}">${displayName}</option>`;
        }).join('');
        
        const filteredEmployees = emp.filter(emp => {
            return user.some(u => 
                    u.role_id === 2 && 
                    emp.id === u.employee_id
                );
            });

        document.getElementById('bill_employee').innerHTML = filteredEmployees
            .map(emp => `<option value="${emp.id}">${emp.name}</option>`)
            .join('');
    } 
    catch(e) { 
        console.error("Error loading dropdown:", e);    
    }
}

async function createBill(e) {
    e.preventDefault();

    const body = {
        vehicle_id: parseInt(document.getElementById('bill_vehicle').value),
        employee_id: parseInt(document.getElementById('bill_employee').value),
        recipient_name: document.getElementById('bill_receiver').value,
        recipient_phone: document.getElementById('bill_phone').value,
        destination_address: "-"
    };

    try {await sendPost('/delivery-bills', body);
        Swal.fire({
            title: 'สำเร็จ!',
            text: 'เพิ่มบิลใหม่เรียบร้อยแล้ว',
            icon: 'success',
            confirmButtonText: 'ตกลง',
            confirmButtonColor: '#3b82f6' 
        });
        showPage('emp-list-bill'); 
    }
    catch (error) {
        console.error("เกิดข้อผิดพลาด: ", error);
    }
}

async function loadBills() {
    console.log("กำลังดึงข้อมูลบิลจากหลังบ้าน...");
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`${API_URL}/delivery-bills`, { 
            headers: {'Authorization': `Bearer ${token}`} 
        });
        
        const bills = await res.json();
        console.log("ได้ข้อมูลบิลมาแล้ว:", bills);

        if (bills.length === 0) {
            document.getElementById('billTableBody').innerHTML = `
                <tr><td colspan="5" class="p-8 text-center text-gray-500">ไม่มีรายการส่งของในขณะนี้</td></tr>
            `;
            return;
        }
        
        // 🚨 แก้ชื่อตัวแปรตรงนี้ให้ตรงกับ Database ใหม่ (id, recipient_name, recipient_phone)
        const html = bills.map(b => `
            <tr class="border-b hover:bg-gray-50 transition">
                <td class="p-4 font-mono text-sm text-gray-500">#${b.id}</td>
                <td class="p-4 font-medium">${b.recipient_name || '-'}</td>
                <td class="p-4 text-gray-500">${b.recipient_phone || '-'}</td>
                <td class="p-4">
                    <span class="px-3 py-1 rounded-full text-xs font-bold shadow-sm ${getStatusColor(b.status)}">
                        ${b.status}
                    </span>
                </td>
                <td class="p-4 text-center">
                    <button onclick="openModal(${b.id}, '${b.status}')" class="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded hover:bg-blue-100 text-xs transition">
                        <i class="fas fa-edit"></i> เปลี่ยนสถานะ
                    </button>
                </td>
            </tr>
        `).join('');
        document.getElementById('billTableBody').innerHTML = html;
        
    } catch(err) {
        console.error("เกิดข้อผิดพลาดในการโหลดบิล:", err); 
    }
}

// ---- 6. HELPERS ----
async function sendPost(endpoint, body) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify(body)
        });
        
        if (!res.ok) {
            const err = await res.json();
            const errorMsg = JSON.stringify(err.detail || err, null, 2);
            Swal.fire({
                icon: 'error',
                title: '❌ เกิดข้อผิดพลาด',
                html: `<pre style="text-align: left; background: #f8f9fa; padding: 10px; border-radius: 5px; font-size: 14px;">${errorMsg}</pre>`,
                confirmButtonColor: '#ef4444',
                confirmButtonText: 'ตกลง'
            });
            throw new Error(errorMsg);
        }
        document.querySelectorAll('input').forEach(i => i.value = '');
    } catch(e) { 
        console.error(e);
        throw e; 
    }
}

function getStatusColor(status) {
    switch(status) {
        case 'Await': 
            return 'bg-yellow-100 text-yellow-800 border border-yellow-200'; // สีเหลือง
        case 'Pending': 
            return 'bg-blue-100 text-blue-800 border border-blue-200';   // สีฟ้า
        case 'Delivered': 
            return 'bg-green-100 text-green-800 border border-green-200'; // สีเขียว
        case 'Cancel': 
            return 'bg-red-100 text-red-800 border border-red-200';     // สีแดง
        default: 
            return 'bg-gray-100 text-gray-800 border border-gray-200';    // สีเทาเผื่อไว้
    }
}

// Modal Logic
function openModal(billId) {
    document.getElementById('modal_bill_id').value = billId; 
    document.getElementById('modal_bill_display').innerText = billId; 
    document.getElementById('statusModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('statusModal').classList.add('hidden');
    // เคลียร์ค่าทิ้งเผื่อเปิดครั้งหน้า
    document.getElementById('modal_bill_id').value = ''; 
    document.getElementById('modal_new_status').value = 'Await';
}

async function saveStatus() {
    const billId = document.getElementById('modal_bill_id').value;
    const select = document.getElementById('modal_new_status');
    const status = select.value;
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`${API_URL}/delivery-bills/${billId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status_type: status }) // ส่งตัวแปรให้ตรงกับ Schema
        });

        if(res.ok) { 
            closeModal(); 
            Swal.fire({
                title: 'สำเร็จ!',
                text: `อัปเดตสถานะบิล #${billId} เป็น "${status}" เรียบร้อยแล้ว`,
                icon: 'success',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#3b82f6'
            }).then(() => {
                // รีโหลดหน้าเว็บเพื่อให้ข้อมูลในตารางอัปเดต
                window.location.reload(); 
            });
        } else { 
            Swal.fire({
                title: '❌ เกิดข้อผิดพลาด',
                text: 'อัปเดตสถานะไม่สำเร็จ (ตรวจสอบข้อมูลอีกครั้ง)',
                icon: 'error',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#ef4444'
            }); 
        }
    } catch (error) {
        console.error("Error saving status:", error);
    }
}


// loadtabledata

async function loadTableData(viewName = "delivery-bills") { 
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`${API_URL}/${viewName}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (!data || data.length === 0) return;

        const columns = Object.keys(data[0]);
        const thead = document.querySelector('thead'); 
        const tbody = document.querySelector('tbody'); 

        // 3.1 สร้างหัวตาราง (Thead)
        let thHtml = '<tr>';
        columns.forEach(col => {
            let niceName = col.replace(/_/g, ' ').toUpperCase();
            thHtml += `<th class="p-3 border-b">${niceName}</th>`;
        });
        
        // เพิ่มหัวตาราง "จัดการ" สำหรับใส่ปุ่ม
        thHtml += `<th class="p-3 border-b text-center">จัดการ</th>`; 
        thHtml += '</tr>';
        thead.innerHTML = thHtml;

        // 3.2 สร้างแถวข้อมูล (Tbody)
        let tbHtml = '';
        data.forEach((row, index) => {
            const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
            tbHtml += `<tr class="${bgClass} hover:bg-blue-50 transition border-b">`;
            
            columns.forEach(col => {
                let cellValue = row[col];
                if (cellValue === null || cellValue === undefined) cellValue = '-';
                
                // 🚨 ถ้าเป็นคอลัมน์ status ให้ใส่สีป้ายกำกับ
                if (col.toLowerCase() === 'status' || col.toLowerCase() === 'status_type') {
                    tbHtml += `<td class="p-3">
                        <span class="px-3 py-1 rounded-full text-xs font-bold shadow-sm ${getStatusColor(cellValue)}">
                            ${cellValue}
                        </span>
                    </td>`;
                } 
                else if (typeof cellValue === 'number') {
                    // ใส่ลูกน้ำให้ตัวเลข
                    cellValue = cellValue.toLocaleString('th-TH');
                    tbHtml += `<td class="p-3">${cellValue}</td>`;
                } else {
                    tbHtml += `<td class="p-3">${cellValue}</td>`;
                }
            });

            // 🚨 ดึง ID มาใส่ในปุ่มอัปเดต
            const rowId = row.id || row.ID || row.bill_id;
            tbHtml += `
                <td class="p-3 text-center">
                    <button onclick="openModal(${rowId})" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded shadow-sm transition">
                        อัปเดต
                    </button>
                </td>
            `;

            tbHtml += '</tr>'; // ปิดแถว
        });
        
        tbody.innerHTML = tbHtml;

    } catch (error) {
        console.error("Error loading data:", error);
    }
}

// ---- 7. CEO CHARTS ----
let invChart, custChart; // เก็บตัวแปรกราฟไว้เพื่อทำลาย (destroy) ก่อนวาดใหม่

async function loadCEOCharts() {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        // ยิง API ดึงข้อมูลจาก View พร้อมกัน 2 ตัว
        const [resInv, resCust] = await Promise.all([
            fetch(`${API_URL}/api/views/vw_warehouse_inventory_value`, { headers }),
            fetch(`${API_URL}/api/views/vw_customer_order_summary`, { headers })
        ]);

        if (!resInv.ok || !resCust.ok) throw new Error("โหลดข้อมูลกราฟไม่สำเร็จ");

        const dataInv = await resInv.json();
        const dataCust = await resCust.json();

        // ==========================================
        // 📊 กราฟที่ 1: มูลค่าคงคลัง (Doughnut Chart)
        // ==========================================
        const invLabels = dataInv.map(d => d.warehouse_name);
        const invValues = dataInv.map(d => d.total_inventory_value);

        if (invChart) invChart.destroy(); // ล้างกราฟเก่าก่อน
        const ctx1 = document.getElementById('inventoryChart').getContext('2d');
        invChart = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: invLabels,
                datasets: [{
                    data: invValues,
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        // ==========================================
        // 📊 กราฟที่ 2: ลูกค้ายอดสั่งซื้อสูงสุด (Horizontal Bar Chart)
        // ==========================================
        // นำข้อมูลลูกค้ามาเรียงลำดับ (Sort) จากยอดซื้อมากไปน้อย แล้วตัดเอาแค่ 5 อันดับแรก

        const sortedCust = dataCust
            .sort((a, b) => b.lifetime_spent - a.lifetime_spent)
            .slice(0, 5); 

        const custLabels = sortedCust.map(d => d.customer_name);
        const custValues = sortedCust.map(d => d.lifetime_spent);

        if (custChart) custChart.destroy(); // ล้างกราฟเก่าก่อน
        const ctx2 = document.getElementById('customerChart').getContext('2d');
        custChart = new Chart(ctx2, {
            type: 'bar', // ใช้กราฟแท่ง
            data: {
                labels: custLabels,
                datasets: [{
                    label: 'ยอดใช้จ่ายสะสม (บาท)',
                    data: custValues,
                    backgroundColor: '#8b5cf6',
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y', // เปลี่ยนกราฟแท่งเป็นแนวนอน จะได้อ่านชื่อลูกค้าง่ายๆ
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false } // ซ่อน Legend เพราะมีแค่แท่งสีเดียว
                }
            }
        });

    } catch (error) {
        console.error("Chart Error:", error);
    }
}

async function deleteData(type, id) {
    const result = await Swal.fire({
        title: 'คุณแน่ใจหรือไม่?',
        text: "ข้อมูลนี้จะถูกลบอย่างถาวรและกู้คืนไม่ได้!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444', 
        cancelButtonColor: '#9ca3af',  
        confirmButtonText: 'ใช่, ลบเลย!',
        cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
        try {
            // ✅ ใช้ API_URL แทนการระบุ 127.0.0.1 ตรงๆ 
            const response = await fetch(`${API_URL}/${type}/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                Swal.fire('ลบสำเร็จ!', 'ข้อมูลถูกลบออกจากระบบแล้ว', 'success');
                loadAdminData(type);
            } else {
                Swal.fire('ลบไม่ได้!', 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ หรือข้อมูลนี้ถูกใช้งานอยู่', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('ผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', 'error');
        }
    }
}

// ฟังก์ชันเปิด/ปิดรหัสผ่าน
function togglePassword() {
    const passwordInput = document.getElementById('new_u_pass'); 
    const eyeIcon = document.getElementById('eye_icon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

function toggleLoginPassword() {
    const passwordInput = document.getElementById('password'); 
    const eyeIcon = document.getElementById('eye_icon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

async function changeVehicleStatus(vehicleId, newStatus) {
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`${API_URL}/vehicles/${vehicleId}/status`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!res.ok) {
            const err = await res.json();
            Swal.fire('ข้อผิดพลาด', err.detail, 'error');
            return;
        }

        Swal.fire('สำเร็จ', 'อัพเดตสถานะรถเรียบร้อยแล้ว', 'success');
        loadAdminData('vehicles'); 
        
    } catch (e) {
        console.error("Error updating status:", e);
    }
}

// ฟังก์ชันสำหรับดึงข้อมูล View มาแสดง (สำหรับ CEO เท่านั้น)
async function fetchAndDisplayView() {
    const viewName = document.getElementById('view-selector').value;
    const token = localStorage.getItem('token');
    
    try {
        const res = await fetch(`${API_URL}/api/views/${viewName}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลรายงานได้");
        
        const data = await res.json();
        
        const thead = document.getElementById('view-table-head');
        const tbody = document.getElementById('view-table-body');
        
        thead.innerHTML = '';
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td class="p-4 text-center text-gray-500">ไม่มีข้อมูลในรายงานนี้</td></tr>';
            return;
        }

        // 1. เพิ่มหัวตาราง "จัดการ"
        let thHtml = '<tr>';
        columns.forEach(col => {
            let niceName = col.replace(/_/g, ' ').toUpperCase();
            thHtml += `<th class="p-3 border-b">${niceName}</th>`;
        });
        thHtml += `<th class="p-3 border-b text-center">จัดการ</th>`; // 🚨 เพิ่มบรรทัดนี้
        thHtml += '</tr>';
        thead.innerHTML = thHtml;

        // 2. เพิ่มปุ่มในแต่ละแถวข้อมูล
        let tbHtml = '';
        data.forEach((row, index) => {
            const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
            tbHtml += `<tr class="${bgClass} hover:bg-blue-50 transition border-b">`;
            
            columns.forEach(col => {
                let cellValue = row[col];
                if (cellValue === null || cellValue === undefined) cellValue = '-';
                if (typeof cellValue === 'number') {
                    cellValue = cellValue.toLocaleString('th-TH');
                }
                tbHtml += `<td class="p-3">${cellValue}</td>`;
            });

            // 🚨 เพิ่มคอลัมน์ปุ่มอัปเดตตรงนี้ (ก่อนปิด </tr>)
            const rowId = row.id || row.ID || row.bill_id;
            tbHtml += `
                <td class="p-3 text-center">
                    <button onclick="openModal(${rowId})" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded shadow-sm transition">
                        อัปเดต
                    </button>
                </td>
            `;

            tbHtml += '</tr>';
        });
        tbody.innerHTML = tbHtml;

    } catch (error) {
        console.error(error);
        document.getElementById('view-table-body').innerHTML = `<tr><td class="p-4 text-center text-red-500"><i class="fas fa-exclamation-triangle"></i> เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
    }
}
