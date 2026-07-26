/* ==========================================
   ⚡ MR. HKT ESPORTS - CORE LOGIC & FIREBASE
   ========================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, onSnapshot, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 🔥 Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyD3TBFpNprregew2VyV6dXOEwuJN970zRo",
    authDomain: "mr-hkt-tournament1.firebaseapp.com",
    projectId: "mr-hkt-tournament1",
    storageBucket: "mr-hkt-tournament1.firebasestorage.app",
    messagingSenderId: "338211432145",
    appId: "1:338211432145:android:6bee8f4f429bb41e1207f0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentActiveUserSession = null;
let currentUserDocId = null;
let activeTransactionType = "";
let selectedPaymentChannelMethod = "";
window.isGuestPreviewMode = false;

// 🔔 Modern Non-Intrusive Toast Notification
window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    let bgColor = 'bg-cardbg border-accent text-white';
    if(type === 'success') bgColor = 'bg-emerald-950/90 border-emerald-500 text-emerald-200';
    if(type === 'error') bgColor = 'bg-rose-950/90 border-rose-500 text-rose-200';

    toast.className = `toast-msg p-3.5 rounded-xl border ${bgColor} shadow-2xl text-xs font-semibold flex items-center gap-2.5 backdrop-blur-md`;
    toast.innerHTML = `<i class="fa-solid fa-circle-info"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
};

// 1. Auth Switchers
window.toggleAuthMode = function(mode) {
    const loginSub = document.getElementById('auth-subview-login');
    const regSub = document.getElementById('auth-subview-register');

    if (mode === 'register') {
        loginSub.classList.add('hidden');
        regSub.classList.remove('hidden');
    } else if (mode === 'preview') {
        document.getElementById('auth-gate-screen').classList.add('hidden');
        window.isGuestPreviewMode = true;
        window.showToast("Browsing in Preview Mode");
    } else {
        regSub.classList.add('hidden');
        loginSub.classList.remove('hidden');
    }
};

window.togglePasswordVisibility = function(inputId, eyeIconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(eyeIconId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = "fa-solid fa-eye-slash";
    } else {
        input.type = 'password';
        icon.className = "fa-solid fa-eye";
    }
};

// 2. Navigation Control
window.switchNavigationTabPanelContext = function(panelId) {
    if (window.isGuestPreviewMode && panelId !== 'panel-home') {
        window.showToast("Please login to access this section!", "error");
        return;
    }

    document.querySelectorAll('.app-panel-view').forEach(p => p.classList.add('hidden'));
    document.getElementById(panelId).classList.remove('hidden');

    document.querySelectorAll('nav button').forEach(b => b.className = "flex-1 py-2.5 rounded-xl flex flex-col items-center gap-1 text-[10px] font-bold uppercase text-slate-400");
    
    if (panelId === 'panel-home') document.getElementById('nav-btn-home').className = "nav-btn-active flex-1 py-2.5 rounded-xl flex flex-col items-center gap-1 text-[10px] font-bold uppercase";
    if (panelId === 'panel-wallet') document.getElementById('nav-btn-wallet').className = "nav-btn-active flex-1 py-2.5 rounded-xl flex flex-col items-center gap-1 text-[10px] font-bold uppercase";
    if (panelId === 'panel-profile') document.getElementById('nav-btn-profile').className = "nav-btn-active flex-1 py-2.5 rounded-xl flex flex-col items-center gap-1 text-[10px] font-bold uppercase";
};

// 3. Login Processing
window.handleAccountLoginProcessing = async function(e) {
    e.preventDefault();
    const email = document.getElementById('login-email-field').value.trim();
    const pass = document.getElementById('login-pass-field').value;

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        document.getElementById('auth-gate-screen').classList.add('hidden');
        window.isGuestPreviewMode = false;
        window.showToast("Login Successful!", "success");
    } catch(err) {
        window.showToast("Login Failed: " + err.message, "error");
    }
};

// 4. Registration Processing
window.handleAccountRegistrationProcessing = async function(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name-field').value.trim();
    const email = document.getElementById('reg-email-field').value.trim().toLowerCase();
    const ffuid = document.getElementById('reg-ffuid-field').value.trim();
    const pass = document.getElementById('reg-pass-field').value;

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await setDoc(doc(db, "users", cred.user.uid), {
            name: name,
            email: email,
            ff_uid: ffuid,
            wallet_balance: 0,
            winning_balance: 0,
            is_banned: false,
            created_at: new Date()
        });
        document.getElementById('auth-gate-screen').classList.add('hidden');
        window.isGuestPreviewMode = false;
        window.showToast("Account Created Successfully!", "success");
    } catch(err) {
        window.showToast("Registration Error: " + err.message, "error");
    }
};

// 5. Auth State Observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserDocId = user.uid;
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.is_banned) {
                    window.showToast("Your account has been suspended!", "error");
                    signOut(auth);
                    return;
                }
                currentActiveUserSession = data;
                document.getElementById('header-balance').innerText = ((data.wallet_balance || 0) + (data.winning_balance || 0)).toFixed(2);
                document.getElementById('wallet-deposit-balance').innerText = (data.wallet_balance || 0).toFixed(2);
                document.getElementById('wallet-winning-balance').innerText = (data.winning_balance || 0).toFixed(2);
                document.getElementById('profile-meta-name').innerText = data.name || "Soldier";
                document.getElementById('profile-meta-email').innerText = data.email || user.email;
                document.getElementById('auth-gate-screen').classList.add('hidden');
            }
        });
    } else if (!window.isGuestPreviewMode) {
        document.getElementById('auth-gate-screen').classList.remove('hidden');
    }
});

// 6. Realtime Tournament Stream
onSnapshot(collection(db, "matches"), (snapshot) => {
    const container = document.getElementById('matches-list-container');
    container.innerHTML = "";
    if (snapshot.empty) {
        container.innerHTML = `<div class="text-center py-12 text-slate-500 text-xs">No active tournaments.</div>`;
        return;
    }

    snapshot.forEach((docItem) => {
        const m = docItem.data();
        const joinedList = m.joined_players || [];
        const isJoined = currentActiveUserSession && joinedList.includes(currentActiveUserSession.ff_uid);

        const card = `
            <div class="match-card bg-cardbg border border-borderline rounded-2xl p-4 flex flex-col gap-3 glass-panel">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="font-gaming font-bold text-xs text-white">${m.title}</h3>
                        <p class="text-[10px] text-slate-400">Map: ${m.map || 'Bermuda'} | Type: ${m.type || 'SOLO'}</p>
                    </div>
                    <span class="text-xs font-black text-accent font-mono">৳${m.entry_fee || 0}</span>
                </div>
                <div class="grid grid-cols-3 gap-2 bg-darkbg p-2.5 rounded-xl text-center text-[10px]">
                    <div><p class="text-slate-500">PRIZE</p><p class="font-bold text-emerald-400">৳${m.prize || 0}</p></div>
                    <div><p class="text-slate-500">KILL</p><p class="font-bold text-amber-400">৳${m.per_kill || 0}</p></div>
                    <div><p class="text-slate-500">SLOTS</p><p class="font-bold text-white">${joinedList.length}/${m.total_slots || 48}</p></div>
                </div>
                ${!isJoined ? `
                    <button onclick="triggerMatchJoinFlow('${docItem.id}')" class="w-full bg-accent hover:bg-accenthover text-white py-3 rounded-xl font-bold uppercase text-xs transition">
                        Join Match
                    </button>
                ` : `
                    <button disabled class="w-full bg-emerald-600/20 text-emerald-400 py-3 rounded-xl font-bold uppercase text-xs cursor-default">
                        Joined
                    </button>
                `}
            </div>
        `;
        container.innerHTML += card;
    });
});

window.triggerMatchJoinFlow = async function(matchId) {
    if (window.isGuestPreviewMode || !auth.currentUser) {
        window.showToast("Please sign in to join matches!", "error");
        return;
    }
    const matchSnap = await getDoc(doc(db, "matches", matchId));
    const matchData = matchSnap.data();

    if ((currentActiveUserSession.wallet_balance || 0) < matchData.entry_fee) {
        window.showToast("Insufficient Balance! Please Add Money.", "error");
        return;
    }

    try {
        await updateDoc(doc(db, "users", currentUserDocId), {
            wallet_balance: currentActiveUserSession.wallet_balance - matchData.entry_fee
        });

        const updatedJoined = matchData.joined_players || [];
        updatedJoined.push(currentActiveUserSession.ff_uid);
        await updateDoc(doc(db, "matches", matchId), { joined_players: updatedJoined });

        window.showToast("Successfully joined match!", "success");
    } catch(err) {
        window.showToast(err.message, "error");
    }
};

// 7. Wallet Transaction Submit
window.openWalletTransactionForm = function(type) {
    activeTransactionType = type;
    document.getElementById('wallet-subview-form').classList.remove('hidden');
};

window.selectPaymentChannel = function(method) {
    selectedPaymentChannelMethod = method;
    document.getElementById('btn-pay-bkash').className = method === 'bkash' ? 'flex-1 border border-bkash bg-bkash/20 text-white p-3 rounded-xl font-bold text-xs' : 'flex-1 border border-borderline bg-darkbg p-3 rounded-xl font-bold text-xs';
    document.getElementById('btn-pay-nagad').className = method === 'nagad' ? 'flex-1 border border-nagad bg-nagad/20 text-white p-3 rounded-xl font-bold text-xs' : 'flex-1 border border-borderline bg-darkbg p-3 rounded-xl font-bold text-xs';
};

window.submitWalletTransactionPayload = async function() {
    const amount = parseFloat(document.getElementById('tx-amount-input').value);
    const phone = document.getElementById('tx-phone-input').value.trim();
    const trxid = document.getElementById('tx-trxid-input').value.trim();

    if (!amount || !phone || !selectedPaymentChannelMethod) {
        window.showToast("Please fill all required inputs!", "error");
        return;
    }

    try {
        await addDoc(collection(db, "transactions"), {
            uid: currentUserDocId,
            user_name: currentActiveUserSession.name,
            amount: amount,
            phone: phone,
            method: selectedPaymentChannelMethod,
            transaction_id_field: trxid || `WITHDRAW-${Date.now().toString().slice(-6)}`,
            type: activeTransactionType,
            status: "pending",
            timestamp: new Date()
        });
        window.showToast("Request Submitted Successfully!", "success");
        document.getElementById('wallet-subview-form').classList.add('hidden');
    } catch(err) {
        window.showToast(err.message, "error");
    }
};

window.handleUserSignOut = function() {
    signOut(auth).then(() => location.reload());
};
