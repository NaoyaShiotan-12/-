// ===============================
// Daily Planner 完全版JS（Googleログイン・セキュリティ対応版）
// ===============================

// --- 状態管理 ---
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;

let selectedDate = "";
let allData = {};
let currentUserId = null; // ログイン中のユーザーIDを入れる変数

let stickyContainer = document.getElementById("stickyContainer");

// --- DOM ---
const calendar = document.getElementById("calendar");
const monthLabel = document.getElementById("monthLabel");
const taskList = document.getElementById("taskList");
const selectedDateLabel = document.getElementById("selectedDate");

// ===============================
// Googleログイン・ログアウト処理
// ===============================
const provider = new firebase.auth.GoogleAuthProvider();

// ログインボタンを押したとき
document.getElementById('loginBtn').onclick = () => {
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log("ログイン成功:", result.user);
        }).catch((error) => {
            console.error("ログインエラー:", error);
            alert("ログインに失敗しました。");
        });
};

// ログアウトボタンを押したとき
document.getElementById('logoutBtn').onclick = () => {
    auth.signOut().then(() => {
        console.log("ログアウトしました");
    });
};

// ログイン状態を24時間自動で監視する
auth.onAuthStateChanged((user) => {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');

    if (user) {
        // ログインしている時
        currentUserId = user.uid; // ユーザー固有のIDをセット
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        userInfo.textContent = `${user.displayName} さん`;
        
        // ログインした人専用のデータを読み込む
        loadData();
    } else {
        // ログアウトしている時
        currentUserId = null;
        allData = {}; // データを画面から消去
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        userInfo.textContent = '未ログイン';
        
        renderCalendar();
        taskList.innerHTML = "";
        selectedDateLabel.textContent = "ログインすると予定を確認・追加できます";
    }
});

// ===============================
// Firebase保存（ログインユーザー専用パスに自動変更）
// ===============================
async function saveData() {
    if (!currentUserId) {
        alert("ログインが必要です");
        return;
    }
    try {
        // 先ほど設定したルールに合わせて、users/ユーザーID/todos/data に保存
        await db.collection("users")
            .doc(currentUserId)
            .collection("todos")
            .doc("data")
            .set({
                data: allData
            });
    } catch (e) {
        console.error("保存エラー:", e);
    }
}

// ===============================
// Firebase読込（ログインユーザー専用パスから自動読込）
// ===============================
async function loadData() {
    if (!currentUserId) return;
    try {
        const doc = await db.collection("users")
            .doc(currentUserId)
            .collection("todos")
            .doc("data")
            .get();

        if (doc.exists) {
            allData = doc.data().data || {};
        } else {
            allData = {};
        }
    } catch (e) {
        console.error("読込エラー:", e);
    }

    renderCalendar();

    if (selectedDate) {
        renderTasks();
    }
}

// ===============================
// カレンダー描画
// ===============================
function renderCalendar() {
    calendar.innerHTML = "";
    monthLabel.textContent = `${currentYear}年 ${currentMonth}月`;

    const dayNames = ["日","月","火","水","木","金","土"];
    dayNames.forEach(d => {
        const el = document.createElement("div");
        el.textContent = d;
        el.style.fontWeight = "bold";
        calendar.appendChild(el);
    });

    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const lastDate = new Date(currentYear, currentMonth, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        calendar.appendChild(document.createElement("div"));
    }

    for (let d = 1; d <= lastDate; d++) {
        const dateStr =
            `${currentYear}/${String(currentMonth).padStart(2,"0")}/${String(d).padStart(2,"0")}`;

        const div = document.createElement("div");
        div.className = "day";
        div.textContent = d;

        if (allData[dateStr]?.length > 0) {
            div.classList.add("hasTask");
        }

        div.onclick = () => {
            if (!currentUserId) {
                alert("ログインしてください");
                return;
            }
            selectedDate = dateStr;
            selectedDateLabel.textContent = `【${dateStr}】`;
            renderTasks();
        };

        calendar.appendChild(div);
    }
}

// ===============================
// タスク表示
// ===============================
function renderTasks() {
    taskList.innerHTML = "";

    if (!selectedDate) return;

    const tasks = allData[selectedDate] || [];

    tasks.forEach((t, index) => {
        const li = document.createElement("li");
        li.className = "taskItem";

        li.innerHTML = `
            <span>${t}</span>
            <button onclick="deleteTask(${index})">削除</button>
        `;

        taskList.appendChild(li);
    });
}

// ===============================
// 追加
// ===============================
document.getElementById("addBtn").onclick = async () => {
    if (!currentUserId) {
        alert("ログインしてください");
        return;
    }

    const h = document.getElementById("hour").value;
    const m = document.getElementById("minute").value;
    const task = document.getElementById("task").value;
    const priority = document.getElementById("priority").value;

    if (!selectedDate) {
        alert("日付を選択してください");
        return;
    }

    if (!h || !m || !task) {
        alert("すべて入力してください");
        return;
    }

    const text = `${h}時${m}分 - ${task} [${priority}]`;

    if (!allData[selectedDate]) {
        allData[selectedDate] = [];
    }

    allData[allData[selectedDate].push(text)];

    await saveData();

    renderCalendar();
    renderTasks();

    document.getElementById("task").value = "";
};

// ===============================
// 削除
// ===============================
async function deleteTask(index) {
    if (!currentUserId) return;
    allData[selectedDate].splice(index, 1);

    await saveData();

    renderCalendar();
    renderTasks();
}

// ===============================
// 月移動
// ===============================
document.getElementById("prevBtn").onclick = () => {
    currentMonth--;
    if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
    }
    renderCalendar();
};

document.getElementById("nextBtn").onclick = () => {
    currentMonth++;
    if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
    }
    renderCalendar();
};

// ===============================
// ダークモード
// ===============================
document.getElementById("darkBtn").onclick = () => {
    document.body.classList.toggle("dark");
};

// ===============================
// 音声入力
// ===============================
const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";

    document.getElementById("voiceBtn").onclick = () => {
        recognition.start();
    };

    recognition.onresult = (e) => {
        document.getElementById("task").value =
            e.results[0][0].transcript;
    };
}

// ===============================
// 初期化
// ===============================
// 起動時はAuthStateChangedが自動で判断するため、ここでの直接呼び出しは不要になりました。
renderCalendar();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}
