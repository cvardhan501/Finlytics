const API = "https://finlytics-backend-i3ro.onrender.com";

let allTransactions = [];
let expenseChart;
let summaryChart;
let pieChart;
let monthlyChart;
let isRegisterMode = false;

function getToken() {
  return localStorage.getItem("expenseToken");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

function showToast(message, type = "success") {
  const toastBox = document.getElementById("toastBox");
  const toast = document.createElement("div");

  toast.className = `toast ${type}`;
  toast.innerText = message;

  toastBox.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3200);
}

function toggleAuth() {
  isRegisterMode = !isRegisterMode;

  document.getElementById("authTitle").innerText = isRegisterMode
    ? "Create your Finlytics account"
    : "Understand Your Money Better.";

  document.getElementById("authBtn").innerText = isRegisterMode
    ? "Register"
    : "Login";

  document.querySelector(".switch-auth b").innerText = isRegisterMode
    ? "Login"
    : "Register";

  document.getElementById("switchText").innerText = isRegisterMode
    ? "Already have an account?"
    : "Don't have an account?";
}

function togglePassword() {
  const passwordInput = document.getElementById("loginPassword");
  passwordInput.type = passwordInput.type === "password" ? "text" : "password";
}

async function loginUser() {
  const name = document.getElementById("loginName").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!name || !password) {
    showToast("Enter username and password", "warning");
    return;
  }

  const endpoint = isRegisterMode ? "/register" : "/login";

  try {
    const res = await fetch(`${API}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password }),
    });

    const data = await res.json();

    if (data.error) {
      showToast(data.error, "error");
      return;
    }

    localStorage.setItem("expenseToken", data.token);
    localStorage.setItem("expenseUserId", data.userId);
    localStorage.setItem("expenseUserName", data.name);

    document.getElementById("loginScreen").style.display = "none";
    showWelcomeUser();
    await loadData();

    showToast(
      isRegisterMode ? "Registered successfully!" : "Login successful!",
    );
  } catch {
    showToast("Backend not connected", "error");
  }
}

function checkLogin() {
  if (getToken()) {
    document.getElementById("loginScreen").style.display = "none";
  }
}

function logoutUser() {
  localStorage.removeItem("expenseToken");
  localStorage.removeItem("expenseUserId");
  localStorage.removeItem("expenseUserName");
  location.reload();
}

function showWelcomeUser() {
  const name = localStorage.getItem("expenseUserName") || "User";
  const welcome = document.getElementById("welcomeUser");

  if (welcome) {
    welcome.innerText = `Hello, ${name} 👋`;
  }
}

function goToSection(id) {
  const section = document.getElementById(id);

  if (section) {
    section.scrollIntoView({ behavior: "smooth" });
  }

  if (id === "graphsSection") {
    setTimeout(() => renderCharts(), 500);
  }
}

function applyAutoDarkMode() {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme) return;

  const hour = new Date().getHours();

  if (hour >= 19 || hour < 6) {
    document.body.classList.add("dark");
    document.getElementById("themeBtn").innerText = "☀️";
  }
}

async function loadData() {
  if (!getToken()) return;

  try {
    const res = await fetch(`${API}/transactions`, {
      headers: authHeaders(),
    });

    allTransactions = await res.json();

    if (allTransactions.error) {
      logoutUser();
      return;
    }

    const filtered = applyPageFilters(allTransactions);

    // renderTransactions(filtered);
    // updateFilteredExpense(filtered);

    // // IMPORTANT: summary cards always use ALL transactions
    // await loadSummary();

    // // graphs also use ALL transactions
    // renderCharts();
    renderTransactions(filtered);

    await loadSummary(); // sets income, balance, today from all data
    updateFilteredExpense(filtered); // updates only Total Expense by filter

    renderCharts();
  } catch {
    showToast("Backend not connected", "error");
  }
}
function updateFilteredExpense(filteredData) {
  const filteredExpense = filteredData
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  document.getElementById("expense").innerText = filteredExpense;
}

function applyPageFilters(data) {
  const typeFilter = document.getElementById("filterType")?.value || "all";
  const categoryFilter =
    document.getElementById("categoryFilter")?.value || "all";
  const searchText =
    document.getElementById("searchInput")?.value.toLowerCase() || "";

  let filtered = [...data];

  if (typeFilter !== "all") {
    filtered = filtered.filter((item) => item.type === typeFilter);
  }

  if (categoryFilter !== "all") {
    filtered = filtered.filter((item) => item.category === categoryFilter);
  }

  if (searchText) {
    filtered = filtered.filter((item) =>
      item.title.toLowerCase().includes(searchText),
    );
  }

  filtered = filterByDate(filtered);

  return filtered;
}

function filterByDate(data) {
  const filter = document.getElementById("dateFilter")?.value || "all";
  const today = new Date();

  if (filter === "all") return data;

  return data.filter((item) => {
    const itemDate = new Date(item.date);

    if (filter === "weekly") {
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      return itemDate >= weekAgo && itemDate <= today;
    }

    if (filter === "monthly") {
      return (
        itemDate.getMonth() === today.getMonth() &&
        itemDate.getFullYear() === today.getFullYear()
      );
    }

    return true;
  });
}

function renderTransactions(data) {
  const list = document.getElementById("list");
  list.innerHTML = "";

  if (data.length === 0) {
    list.innerHTML = `
      <tr>
        <td colspan="6" class="empty">No transactions found</td>
      </tr>
    `;
    return;
  }

  data.forEach((item) => {
    const row = document.createElement("tr");

    const badgeClass =
      item.type === "income" ? "income-badge" : "expense-badge";
    const amountClass = item.type === "income" ? "income" : "expense";
    const sign = item.type === "income" ? "+" : "-";

    row.innerHTML = `
      <td><strong>${item.title}</strong></td>
      <td>${item.category}</td>
      <td><span class="badge ${badgeClass}">${item.type}</span></td>
      <td>${item.date}</td>
      <td class="${amountClass}"><strong>${sign} ₹${item.amount}</strong></td>
      <td>
        <button class="delete-btn" onclick="deleteTransaction('${item._id}')">
          Delete
        </button>
      </td>
    `;

    list.appendChild(row);
  });
}

async function addTransaction() {
  const title = document.getElementById("title").value.trim();
  const amount = document.getElementById("amount").value;
  const type = document.querySelector('input[name="type"]:checked').value;
  const category = document.getElementById("category").value;

  const dateMode =
    document.querySelector('input[name="dateMode"]:checked')?.value || "auto";

  const date =
    dateMode === "manual" ? document.getElementById("date").value : "";

  if (!title || !amount || Number(amount) <= 0) {
    showToast("Please enter valid title and amount", "warning");
    return;
  }

  if (dateMode === "manual" && !date) {
    showToast("Please select manual date", "warning");
    return;
  }

  try {
    const res = await fetch(`${API}/transactions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        title,
        amount,
        type,
        category,
        date,
      }),
    });

    const data = await res.json();

    if (data.error) {
      showToast(data.error, "error");
      return;
    }

    document.getElementById("title").value = "";
    document.getElementById("amount").value = "";
    if (document.getElementById("date"))
      document.getElementById("date").value = "";

    await loadData();
    showToast("Transaction added successfully!");
  } catch {
    showToast("Failed to add transaction", "error");
  }
}

function toggleDateMode() {
  const mode = document.querySelector('input[name="dateMode"]:checked').value;
  const dateInput = document.getElementById("date");

  if (mode === "manual") {
    dateInput.style.display = "block";
  } else {
    dateInput.style.display = "none";
    dateInput.value = "";
  }
}

async function deleteTransaction(id) {
  try {
    const res = await fetch(`${API}/transactions/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    const data = await res.json();

    if (data.error) {
      showToast(data.error, "error");
      return;
    }

    await loadData();
    showToast("Deleted successfully!");
  } catch {
    showToast("Delete failed", "error");
  }
}

async function confirmClearAll() {
  const confirmDelete = confirm(
    "⚠ Are you sure you want to clear all transactions?",
  );

  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API}/transactions`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    const data = await res.json();

    if (data.error) {
      showToast(data.error, "error");
      return;
    }

    allTransactions = [];
    renderTransactions([]);
    await loadSummary();
    renderCharts();

    showToast("All transactions cleared successfully!");
  } catch {
    showToast("Clear all failed", "error");
  }
}

async function setBudget() {
  const budget = document.getElementById("budgetInput").value;

  if (!budget || Number(budget) <= 0) {
    showToast("Enter valid budget", "warning");
    return;
  }

  try {
    const res = await fetch(`${API}/budget`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ budget }),
    });

    const data = await res.json();

    if (data.error) {
      showToast(data.error, "error");
      return;
    }

    document.getElementById("budgetInput").value = "";
    await loadSummary();

    showToast("Budget updated successfully!");
  } catch {
    showToast("Budget update failed", "error");
  }
}

async function setSavingsGoal() {
  const savingsGoal = document.getElementById("savingsGoalInput").value;

  if (!savingsGoal || Number(savingsGoal) <= 0) {
    showToast("Enter valid savings goal", "warning");
    return;
  }

  try {
    const res = await fetch(`${API}/savings-goal`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ savingsGoal }),
    });

    const data = await res.json();

    if (data.error) {
      showToast(data.error, "error");
      return;
    }

    document.getElementById("savingsGoalInput").value = "";
    await loadSummary();

    showToast("Savings goal updated successfully!");
  } catch {
    showToast("Savings goal update failed", "error");
  }
}

async function loadSummary() {
  const res = await fetch(`${API}/summary`, {
    headers: authHeaders(),
  });

  const data = await res.json();

  document.getElementById("income").innerText = data.income;
  document.getElementById("expense").innerText = data.expense;
  document.getElementById("balance").innerText = data.balance;

  // Today Expense always uses all transactions
  const today = new Date().toISOString().split("T")[0];

  const todayExpense = allTransactions
    .filter((item) => item.type === "expense" && item.date === today)
    .reduce((sum, item) => sum + Number(item.amount), 0);

  if (document.getElementById("todayExpense")) {
    document.getElementById("todayExpense").innerText = todayExpense;
  }

  updateBudget(data);
  updateSavingsGoal(data);
  generateInsights(data);
}

function updateBudget(data) {
  const status = document.getElementById("budgetStatus");
  const progressBar = document.getElementById("progressBar");

  if (data.budget === 0) {
    status.innerText = "No budget set yet.";
    progressBar.style.width = "0%";
    progressBar.style.background = "#16a34a";
    status.style.color = "var(--muted)";
    return;
  }

  const used = Math.min(data.budgetUsed, 100);
  progressBar.style.width = `${used}%`;

  if (data.budgetExceeded) {
    status.innerText = `🚨 Budget exceeded by ₹${data.expense - data.budget}`;
    status.style.color = "#dc2626";
    progressBar.style.background = "#dc2626";
  } else if (used >= 80) {
    status.innerText = `⚠ ${used.toFixed(0)}% budget used. Remaining ₹${data.remainingBudget}`;
    status.style.color = "#f59e0b";
    progressBar.style.background = "#f59e0b";
  } else {
    status.innerText = `✅ Remaining budget ₹${data.remainingBudget}`;
    status.style.color = "#16a34a";
    progressBar.style.background = "#16a34a";
  }
}

function updateSavingsGoal(data) {
  const status = document.getElementById("savingsStatus");
  const bar = document.getElementById("savingsProgressBar");

  if (!status || !bar) return;

  if (data.savingsGoal === 0) {
    status.innerText = "No savings goal set yet.";
    bar.style.width = "0%";
    return;
  }

  const progress = Math.min(data.savingsProgress, 100);

  bar.style.width = `${progress}%`;
  status.innerText = `Savings progress: ${progress.toFixed(0)}% of ₹${data.savingsGoal}`;
}

function generateInsights(summary) {
  const box = document.getElementById("insightBox");
  box.innerHTML = "";

  if (allTransactions.length === 0) {
    addInsight("Add your first transaction to generate smart insights.");
    return;
  }

  const expenses = allTransactions.filter((item) => item.type === "expense");

  if (summary.balance > 0) {
    addInsight(`You are saving ₹${summary.balance}. Good financial control.`);
  }

  if (summary.expense > summary.income) {
    addInsight("Your expenses are greater than your income. Reduce spending.");
  }

  if (summary.budgetExceeded) {
    addInsight(
      "Monthly budget crossed. Avoid extra shopping or food spending.",
    );
  }

  const categoryTotals = {};

  expenses.forEach((item) => {
    categoryTotals[item.category] =
      (categoryTotals[item.category] || 0) + Number(item.amount);
  });

  const top = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  if (top) {
    addInsight(`Highest spending category is ${top[0]} with ₹${top[1]}.`);
  }

  const weekendExpense = expenses
    .filter((item) => {
      const day = new Date(item.date).getDay();
      return day === 0 || day === 6;
    })
    .reduce((sum, item) => sum + Number(item.amount), 0);

  if (weekendExpense > 0) {
    addInsight(
      `Weekend spending detected: ₹${weekendExpense}. Track weekend habits.`,
    );
  }
}

function addInsight(text) {
  const div = document.createElement("div");
  div.className = "insight";
  div.innerText = text;
  document.getElementById("insightBox").appendChild(div);
}

function groupByDate() {
  const filter = document.getElementById("graphFilter")?.value || "daily";
  const grouped = {};

  allTransactions.forEach((item) => {
    const date = new Date(item.date);
    let key = item.date;

    if (filter === "weekly") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split("T")[0];
    }

    if (filter === "monthly") {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    if (!grouped[key]) grouped[key] = { income: 0, expense: 0 };

    if (item.type === "income") grouped[key].income += Number(item.amount);
    if (item.type === "expense") grouped[key].expense += Number(item.amount);
  });

  return grouped;
}

function groupCategorySpending() {
  const grouped = {};

  allTransactions
    .filter((item) => item.type === "expense")
    .forEach((item) => {
      grouped[item.category] =
        (grouped[item.category] || 0) + Number(item.amount);
    });

  return grouped;
}

function groupMonthlyTrend() {
  const grouped = {};

  allTransactions.forEach((item) => {
    const date = new Date(item.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!grouped[key]) grouped[key] = { income: 0, expense: 0 };

    if (item.type === "income") grouped[key].income += Number(item.amount);
    if (item.type === "expense") grouped[key].expense += Number(item.amount);
  });

  return grouped;
}

function chartOptions(textColor, gridColor) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 2500,
      easing: "easeInOutCubic",
    },
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: textColor },
      },
    },
    scales: {
      x: {
        ticks: {
          color: textColor,
          maxRotation: 45,
          minRotation: 35,
        },
        grid: { color: gridColor },
      },
      y: {
        beginAtZero: true,
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
    },
  };
}

function renderCharts() {
  const isDark = document.body.classList.contains("dark");

  const textColor = isDark ? "#f8fafc" : "#0f172a";
  const gridColor = isDark ? "rgba(255,255,255,0.18)" : "rgba(15,23,42,0.18)";

  const cardBg = isDark ? "#020617" : "#ffffff";

  if (summaryChart) summaryChart.destroy();
  if (expenseChart) expenseChart.destroy();
  if (pieChart) pieChart.destroy();
  if (monthlyChart) monthlyChart.destroy();

  const grouped = groupByDate();
  const labels = Object.keys(grouped).sort();

  const incomeData = labels.map((label) => grouped[label].income);
  const expenseData = labels.map((label) => grouped[label].expense);

  summaryChart = new Chart(document.getElementById("summaryChart"), {
    type: "line",
    data: {
      labels: labels.length ? labels : ["No Data"],
      datasets: [
        {
          label: "Income",
          data: incomeData.length ? incomeData : [0],
          borderColor: "#22c55e",
          backgroundColor: "rgba(34,197,94,0.22)",
          pointBackgroundColor: "#22c55e",
          pointBorderColor: cardBg,
          pointRadius: 6,
          borderWidth: 4,
          fill: true,
          tension: 0.35,
        },
        {
          label: "Expense",
          data: expenseData.length ? expenseData : [0],
          borderColor: "#ef4444",
          backgroundColor: "rgba(239,68,68,0.22)",
          pointBackgroundColor: "#ef4444",
          pointBorderColor: cardBg,
          pointRadius: 6,
          borderWidth: 4,
          fill: true,
          tension: 0.35,
        },
      ],
    },
    options: chartOptions(textColor, gridColor),
  });

  const categoryTotals = groupCategorySpending();
  const catLabels = Object.keys(categoryTotals);
  const catValues = Object.values(categoryTotals);

  expenseChart = new Chart(document.getElementById("expenseChart"), {
    type: "line",
    data: {
      labels: catLabels.length ? catLabels : ["No Expense"],
      datasets: [
        {
          label: "Category Spending",
          data: catValues.length ? catValues : [0],
          borderColor: "#38bdf8",
          backgroundColor: "rgba(56,189,248,0.22)",
          pointBackgroundColor: "#38bdf8",
          pointBorderColor: cardBg,
          pointRadius: 6,
          borderWidth: 4,
          fill: true,
          tension: 0.35,
        },
      ],
    },
    options: chartOptions(textColor, gridColor),
  });

  const monthly = groupMonthlyTrend();
  const monthLabels = Object.keys(monthly).sort();

  monthlyChart = new Chart(document.getElementById("monthlyChart"), {
    type: "bar",
    data: {
      labels: monthLabels.length ? monthLabels : ["No Data"],
      datasets: [
        {
          label: "Monthly Income",
          data: monthLabels.length
            ? monthLabels.map((m) => monthly[m].income)
            : [0],
          backgroundColor: "rgba(34,197,94,0.75)",
        },
        {
          label: "Monthly Expense",
          data: monthLabels.length
            ? monthLabels.map((m) => monthly[m].expense)
            : [0],
          backgroundColor: "rgba(239,68,68,0.75)",
        },
      ],
    },
    options: chartOptions(textColor, gridColor),
  });

  pieChart = new Chart(document.getElementById("pieChart"), {
    type: "doughnut",
    data: {
      labels: catLabels.length ? catLabels : ["No Expense"],
      datasets: [
        {
          data: catValues.length ? catValues : [1],
          backgroundColor: [
            "#38bdf8",
            "#22c55e",
            "#f59e0b",
            "#ef4444",
            "#8b5cf6",
            "#ec4899",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 2000,
        easing: "easeInOutCubic",
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: textColor },
        },
      },
    },
  });
}

function toggleTheme() {
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");
  document.getElementById("themeBtn").innerText = isDark ? "☀️" : "🌙";

  localStorage.setItem("theme", isDark ? "dark" : "light");

  renderCharts();
}

function loadTheme() {
  const theme = localStorage.getItem("theme");

  if (theme === "dark") {
    document.body.classList.add("dark");
    document.getElementById("themeBtn").innerText = "☀️";
  }
}

function getReportDataByChoice() {
  const choice = prompt(
    "Choose report filter:\n\n1 = All Transactions\n2 = Today Transactions\n3 = This Week\n4 = This Month\n5 = Category Wise",
  );

  let data = [...allTransactions];

  if (choice === "2") {
    const today = new Date().toISOString().split("T")[0];
    data = data.filter((item) => item.date === today);
  }

  if (choice === "3") {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);

    data = data.filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate >= weekAgo && itemDate <= today;
    });
  }

  if (choice === "4") {
    const today = new Date();

    data = data.filter((item) => {
      const itemDate = new Date(item.date);
      return (
        itemDate.getMonth() === today.getMonth() &&
        itemDate.getFullYear() === today.getFullYear()
      );
    });
  }

  if (choice === "5") {
    const category = prompt(
      "Enter category:\nFood\nTravel\nShopping\nBills\nSalary\nOther",
    );

    if (category) {
      data = data.filter(
        (item) => item.category.toLowerCase() === category.toLowerCase(),
      );
    }
  }

  return data;
}

// function printReport() {
//   if (allTransactions.length === 0) {
//     showToast("No transactions to print", "warning");
//     return;
//   }

//   const reportData = getReportDataByChoice();

//   if (reportData.length === 0) {
//     showToast("No transactions found for selected report filter", "warning");
//     return;
//   }

//   const includeToday = confirm(
//     "Do you want to include Today Expense in the report?\n\nOK = Include\nCancel = Hide"
//   );

//   const userName = localStorage.getItem("expenseUserName") || "User";

//   const income = reportData
//     .filter((item) => item.type === "income")
//     .reduce((sum, item) => sum + Number(item.amount), 0);

//   const expense = reportData
//     .filter((item) => item.type === "expense")
//     .reduce((sum, item) => sum + Number(item.amount), 0);

//   const balance = income - expense;

//   const today = new Date().toISOString().split("T")[0];

//   const todayExpense = reportData
//     .filter((item) => item.type === "expense" && item.date === today)
//     .reduce((sum, item) => sum + Number(item.amount), 0);

//   let rows = "";

//   reportData.forEach((item) => {
//     const isIncome = item.type === "income";
//     const color = isIncome ? "#16a34a" : "#dc2626";
//     const sign = isIncome ? "+" : "-";

//     rows += `
//       <tr>
//         <td>${item.date}</td>
//         <td>${item.title}</td>
//         <td>${item.category}</td>
//         <td style="color:${color}; font-weight:700; text-transform:capitalize;">
//           ${item.type}
//         </td>
//         <td style="color:${color}; font-weight:700;">
//           ${sign} ₹${item.amount}
//         </td>
//       </tr>
//     `;
//   });

//   const todayCard = includeToday
//     ? `
//       <div class="summary-card today">
//         <h4>Today Expense</h4>
//         <h2>₹${todayExpense}</h2>
//       </div>
//     `
//     : "";

//   const reportWindow = window.open("", "", "width=1100,height=800");

//   reportWindow.document.write(`
//     <html>
//     <head>
//       <title>Finlytics Expense Report</title>

//       <style>
//         * {
//           box-sizing: border-box;
//           font-family: Arial, sans-serif;
//         }

//         body {
//           margin: 0;
//           padding: 30px;
//           background: #f8fafc;
//           color: #0f172a;
//         }

//         .report {
//           max-width: 1000px;
//           margin: auto;
//           background: white;
//           padding: 35px;
//           border-radius: 18px;
//           box-shadow: 0 10px 35px rgba(15, 23, 42, 0.12);
//         }

//         .header {
//           display: flex;
//           justify-content: space-between;
//           align-items: flex-start;
//           border-bottom: 2px dashed #cbd5e1;
//           padding-bottom: 20px;
//           margin-bottom: 25px;
//         }

//         .brand {
//           display: flex;
//           gap: 15px;
//           align-items: center;
//         }

//         .logo {
//           width: 70px;
//           height: 70px;
//           border-radius: 18px;
//           object-fit: contain;
//         }

//         .brand h1 {
//           margin: 0;
//           font-size: 34px;
//           color: #0284c7;
//         }

//         .brand p {
//           margin: 4px 0;
//           color: #475569;
//         }

//         .report-title {
//           text-align: right;
//         }

//         .report-title h2 {
//           margin: 0 0 12px;
//           font-size: 24px;
//           color: #0f172a;
//         }

//         .report-title p {
//           margin: 6px 0;
//           color: #475569;
//           font-size: 14px;
//         }

//         .summary {
//           display: grid;
//           grid-template-columns: repeat(${includeToday ? 4 : 3}, 1fr);
//           gap: 16px;
//           margin: 25px 0;
//         }

//         .summary-card {
//           border: 1px solid #cbd5e1;
//           padding: 18px;
//           border-radius: 16px;
//           text-align: center;
//           background: #ffffff;
//         }

//         .summary-card h4 {
//           margin: 0 0 10px;
//           color: #475569;
//           font-size: 14px;
//           text-transform: uppercase;
//         }

//         .summary-card h2 {
//           margin: 0;
//           font-size: 26px;
//         }

//         .income h2 {
//           color: #16a34a;
//         }

//         .expense h2 {
//           color: #dc2626;
//         }

//         .today h2 {
//           color: #0284c7;
//         }

//         .balance h2 {
//           color: #7c3aed;
//         }

//         .section-title {
//           margin-top: 30px;
//           margin-bottom: 12px;
//           font-size: 20px;
//           color: #0f172a;
//         }

//         table {
//           width: 100%;
//           border-collapse: collapse;
//           overflow: hidden;
//           border-radius: 14px;
//         }

//         th {
//           background: linear-gradient(135deg, #6366f1, #8b5cf6);
//           color: white;
//           padding: 13px;
//           text-align: left;
//           font-size: 14px;
//         }

//         td {
//           border-bottom: 1px solid #e2e8f0;
//           padding: 13px;
//           font-size: 14px;
//         }

//         tr:nth-child(even) {
//           background: #f8fafc;
//         }

//         .note {
//           margin-top: 18px;
//           color: #64748b;
//           font-size: 13px;
//         }

//         .footer {
//           margin-top: 35px;
//           padding-top: 20px;
//           border-top: 2px dashed #cbd5e1;
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//           color: #475569;
//         }

//         .signature {
//           font-size: 20px;
//           font-family: cursive;
//           color: #0f172a;
//         }

//         .developer {
//           text-align: right;
//           font-size: 14px;
//         }

//         @media print {
//           body {
//             background: white;
//             padding: 0;
//           }

//           .report {
//             box-shadow: none;
//             border-radius: 0;
//           }
//         }
//       </style>
//     </head>

//     <body>
//       <div class="report">

//         <div class="header">
//           <div class="brand">
//             <img src="assets/finlytics-logo.png" class="logo" />
//             <div>
//               <h1>Finlytics</h1>
//               <p><strong>Expense Tracker</strong></p>
//               <p>Understand Your Money Better.</p>
//             </div>
//           </div>

//           <div class="report-title">
//             <h2>EXPENSE REPORT</h2>
//             <p><strong>User Name:</strong> ${userName}</p>
//             <p><strong>Generated On:</strong> ${new Date().toLocaleString()}</p>
//           </div>
//         </div>

//         <div class="summary">
//           <div class="summary-card income">
//             <h4>Total Income</h4>
//             <h2>₹${income}</h2>
//           </div>

//           <div class="summary-card expense">
//             <h4>Total Expense</h4>
//             <h2>₹${expense}</h2>
//           </div>

//           ${todayCard}

//           <div class="summary-card balance">
//             <h4>Balance</h4>
//             <h2>₹${balance}</h2>
//           </div>
//         </div>

//         <h3 class="section-title">Transactions</h3>

//         <table>
//           <thead>
//             <tr>
//               <th>Date</th>
//               <th>Title</th>
//               <th>Category</th>
//               <th>Type</th>
//               <th>Amount</th>
//             </tr>
//           </thead>

//           <tbody>
//             ${rows}
//           </tbody>
//         </table>

//         <p class="note">
//           * This report is generated from selected Finlytics data.
//         </p>

//         <div class="footer">
//           <div>
//             <p class="signature">Finlytics Team</p>
//             <p>Track today, enjoy tomorrow.</p>
//           </div>

//           <div class="developer">
//             <p><strong>Stay Financially Fit</strong></p>
//             <p>Designed & Developed by C Vishnu Vardhan ❤️</p>
//           </div>
//         </div>

//       </div>
//     </body>
//     </html>
//   `);

//   reportWindow.document.close();
//   reportWindow.focus();

//   setTimeout(() => {
//     reportWindow.print();
//   }, 500);
// }

// function printReport() {
//   const filteredData = applyPageFilters(allTransactions);

//   if (filteredData.length === 0) {
//     showToast("No transactions to print", "warning");
//     return;
//   }

//   const userName = localStorage.getItem("expenseUserName") || "User";

//   // totals based on filtered data
//   const income = filteredData
//     .filter(item => item.type === "income")
//     .reduce((sum, item) => sum + Number(item.amount), 0);

//   const expense = filteredData
//     .filter(item => item.type === "expense")
//     .reduce((sum, item) => sum + Number(item.amount), 0);

//   const balance = income - expense;

//   const today = new Date().toISOString().split("T")[0];

//   const todayExpense = filteredData
//     .filter(item => item.type === "expense" && item.date === today)
//     .reduce((sum, item) => sum + Number(item.amount), 0);

//   let rows = "";

//   filteredData.forEach(item => {
//     const isIncome = item.type === "income";
//     const color = isIncome ? "#16a34a" : "#dc2626";
//     const sign = isIncome ? "+" : "-";

//     rows += `
//       <tr>
//         <td>${item.date}</td>
//         <td>${item.title}</td>
//         <td>${item.category}</td>
//         <td style="color:${color}; font-weight:700;">${item.type}</td>
//         <td style="color:${color}; font-weight:700;">
//           ${sign} ₹${item.amount}
//         </td>
//       </tr>
//     `;
//   });
//   const logoURL = new URL("assets/finlytics-logo.png", window.location.href).href;

//   const reportWindow = window.open("", "", "width=1100,height=800");

//   (`
//     <html>
//     <head>
//       <title>Finlytics Report</title>
//       <streportWindow.document.writeyle>
//         body {
//           font-family: Arial;
//           padding: 30px;
//           background: #f8fafc;
//         }

//         .report {
//           background: white;
//           padding: 30px;
//           border-radius: 16px;
//         }

//         h1 { color: #0284c7; }
//         h2 { margin-bottom: 5px; }

//         .top {
//           display: flex;
//           justify-content: space-between;
//           margin-bottom: 20px;
//         }

//         .summary {
//           display: grid;
//           grid-template-columns: repeat(4,1fr);
//           gap: 10px;
//           margin-bottom: 20px;
//         }

//         .card {
//           border: 1px solid #ddd;
//           padding: 12px;
//           text-align: center;
//           border-radius: 10px;
//         }

//         table {
//           width: 100%;
//           border-collapse: collapse;
//         }

//         th {
//           background: #6366f1;
//           color: white;
//           padding: 10px;
//         }

//         td {
//           padding: 10px;
//           border-bottom: 1px solid #ddd;
//         }

//         .footer {
//           margin-top: 20px;
//           text-align: center;
//           color: #555;
//         }
//       </streportWindow.document.writeyle>
//     </head>

//     <body>
//       <div class="report">

//         <h1>Finlytics</h1>
//         <p>Understand Your Money Better</p>

//         <div class="top">
//           <div>
//             <h3>User: ${userName}</h3>
//           </div>
//           <div>
//             <p>${new Date().toLocaleString()}</p>
//           </div>
//         </div>

//         <div class="summary">
//           <div class="card"><b>Income</b><br>₹${income}</div>
//           <div class="card"><b>Expense</b><br>₹${expense}</div>
//           <div class="card"><b>Today</b><br>₹${todayExpense}</div>
//           <div class="card"><b>Balance</b><br>₹${balance}</div>
//         </div>

//         <table>
//           <thead>
//             <tr>
//               <th>Date</th>
//               <th>Title</th>
//               <th>Category</th>
//               <th>Type</th>
//               <th>Amount</th>
//             </tr>
//           </thead>
//           <tbody>
//             ${rows}
//           </tbody>
//         </table>

//         <div class="footer">
//           <p>Designed & Developed by C Vishnu Vardhan ❤️</p>
//         </div>

//       </div>
//     </body>
//     </html>
//   `);

//   reportWindow.document.close();
//   reportWindow.print();
// }

function printReport() {
  const filteredData = applyPageFilters(allTransactions);

  if (filteredData.length === 0) {
    showToast("No transactions to print", "warning");
    return;
  }

  const userName = localStorage.getItem("expenseUserName") || "User";

  // const income = filteredData
  //   .filter((item) => item.type === "income")
  //   .reduce((sum, item) => sum + Number(item.amount), 0);

  // const expense = filteredData
  //   .filter((item) => item.type === "expense")
  //   .reduce((sum, item) => sum + Number(item.amount), 0);

  // const balance = income - expense;

  // 🔥 ALWAYS calculate from ALL transactions
  // 🔒 Income always full data
  const income = allTransactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  // 🔄 Expense based on filter
  const expense = filteredData
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  // 🔄 Balance based on filtered expense
  const balance = income - expense;

  const today = new Date().toISOString().split("T")[0];

  // 🔥 Always calculate today expense from ALL data
  const todayExpense = allTransactions
    .filter((item) => item.type === "expense" && item.date === today)
    .reduce((sum, item) => sum + Number(item.amount), 0);
  let rows = "";

  filteredData.forEach((item) => {
    const isIncome = item.type === "income";
    const color = isIncome ? "#16a34a" : "#dc2626";
    const sign = isIncome ? "+" : "-";

    rows += `
      <tr>
        <td>${item.date}</td>
        <td>${item.title}</td>
        <td>${item.category}</td>
        <td style="color:${color}; font-weight:700; text-transform:capitalize;">
          ${item.type}
        </td>
        <td style="color:${color}; font-weight:700;">
          ${sign} ₹${item.amount}
        </td>
      </tr>
    `;
  });

  const logoURL = new URL("assets/finlytics-logo.png", window.location.href)
    .href;

  const reportWindow = window.open("", "", "width=1100,height=800");

  reportWindow.document.write(`
    <html>
    <head>
      <title>Finlytics Report</title>

      <style>
        * {
          box-sizing: border-box;
          font-family: Arial, sans-serif;
        }

        body {
          margin: 0;
          padding: 30px;
          background: #f8fafc;
          color: #0f172a;
        }

        .report {
          max-width: 1000px;
          margin: auto;
          background: white;
          padding: 35px;
          border-radius: 18px;
          box-shadow: 0 10px 35px rgba(15, 23, 42, 0.12);
        }

        .report-header {
          display: flex;
          align-items: center;
          gap: 16px;
          border-bottom: 2px dashed #cbd5e1;
          padding-bottom: 18px;
          margin-bottom: 22px;
        }

        .logo {
          width: 76px;
          height: 76px;
          object-fit: contain;
          border-radius: 16px;
        }

        .report-header h1 {
          margin: 0;
          color: #0284c7;
          font-size: 36px;
        }

        .report-header p {
          margin: 5px 0 0;
          color: #475569;
          font-size: 15px;
        }

        .top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .top h3 {
          margin: 0;
          color: #0f172a;
        }

        .top p {
          margin: 5px 0;
          color: #475569;
        }

        .summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 26px;
        }

        .card {
          border: 1px solid #cbd5e1;
          padding: 16px;
          text-align: center;
          border-radius: 14px;
          background: #ffffff;
        }

        .card b {
          display: block;
          margin-bottom: 8px;
          color: #475569;
          font-size: 13px;
          text-transform: uppercase;
        }

        .card span {
          font-size: 24px;
          font-weight: 800;
        }

        .income-card span {
          color: #16a34a;
        }

        .expense-card span {
          color: #dc2626;
        }

        .today-card span {
          color: #0284c7;
        }

        .balance-card span {
          color: #7c3aed;
        }

        .section-title {
          margin: 8px 0 14px;
          font-size: 21px;
          color: #0f172a;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          overflow: hidden;
          border-radius: 14px;
        }

        th {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          padding: 13px;
          text-align: left;
          font-size: 14px;
        }

        td {
          padding: 13px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 14px;
        }

        tr:nth-child(even) {
          background: #f8fafc;
        }

        .note {
          margin-top: 18px;
          color: #64748b;
          font-size: 13px;
        }

        .footer {
          margin-top: 32px;
          padding-top: 18px;
          border-top: 2px dashed #cbd5e1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #475569;
        }

        .signature {
          font-size: 20px;
          font-family: cursive;
          color: #0f172a;
          margin: 0;
        }

        .developer {
          text-align: right;
          font-size: 14px;
        }

        @media print {
          body {
            background: white;
            padding: 0;
          }

          .report {
            max-width: none;
            box-shadow: none;
            border-radius: 0;
          }
        }
      </style>
    </head>

    <body>
      <div class="report">

        <div class="report-header">
          <img src="${logoURL}" class="logo" alt="Finlytics Logo" />
          <div>
            <h1>Finlytics</h1>
            <p><strong>Expense Tracker</strong></p>
            <p>Understand Your Money Better.</p>
          </div>
        </div>

        <div class="top">
          <div>
            <h3>User Name: ${userName}</h3>
            <p>Report generated from current selected filters</p>
          </div>

          <div>
            <p><strong>Generated On:</strong></p>
            <p>${new Date().toLocaleString()}</p>
          </div>
        </div>

        <div class="summary">
          <div class="card income-card">
            <b>Total Income</b>
            <span>₹${income}</span>
          </div>

          <div class="card expense-card">
            <b>Total Expense</b>
            <span>₹${expense}</span>
          </div>

          <div class="card today-card">
            <b>Today Expense</b>
            <span>₹${todayExpense}</span>
          </div>

          <div class="card balance-card">
            <b>Balance</b>
            <span>₹${balance}</span>
          </div>
        </div>

        <h3 class="section-title">Transactions</h3>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Category</th>
              <th>Type</th>
              <th>Amount</th>
            </tr>
          </thead>

          <tbody>
            ${rows}
          </tbody>
        </table>

        <p class="note">
          * This report is generated from the transactions currently visible after applying filters in Finlytics.
        </p>

        <div class="footer">
          <div>
            <p class="signature">Finlytics Team</p>
            <p>Track today, enjoy tomorrow.</p>
          </div>

          <div class="developer">
            <p><strong>Stay Financially Fit</strong></p>
            <p>Designed & Developed by C Vishnu Vardhan ❤️</p>
          </div>
        </div>

      </div>
    </body>
    </html>
  `);

  reportWindow.document.close();
  reportWindow.focus();

  setTimeout(() => {
    reportWindow.print();
  }, 600);
}

function downloadPDF() {
  if (allTransactions.length === 0) {
    showToast("No transactions to export", "warning");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const userName = localStorage.getItem("expenseUserName") || "User";
  const income = document.getElementById("income").innerText;
  const expense = document.getElementById("expense").innerText;
  const balance = document.getElementById("balance").innerText;

  doc.setFontSize(22);
  doc.text("Finlytics", 14, 18);

  doc.setFontSize(11);
  doc.text("Understand Your Money Better.", 14, 26);
  doc.text(`User: ${userName}`, 14, 36);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 44);

  doc.text(`Total Income: Rs. ${income}`, 14, 56);
  doc.text(`Total Expense: Rs. ${expense}`, 14, 64);
  doc.text(`Balance: Rs. ${balance}`, 14, 72);

  const rows = allTransactions.map((item) => [
    item.title,
    item.category,
    item.type,
    item.date,
    `Rs. ${item.amount}`,
  ]);

  doc.autoTable({
    head: [["Title", "Category", "Type", "Date", "Amount"]],
    body: rows,
    startY: 82,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [2, 132, 199] },
    didParseCell: function (data) {
      if (data.section === "body" && data.column.index === 2) {
        if (data.cell.raw === "income") {
          data.cell.styles.textColor = [22, 163, 74];
        }
        if (data.cell.raw === "expense") {
          data.cell.styles.textColor = [220, 38, 38];
        }
      }
    },
  });

  doc.save("Finlytics-Transaction-Report.pdf");
  showToast("PDF downloaded successfully!");
}

loadTheme();
applyAutoDarkMode();
checkLogin();
showWelcomeUser();
loadData();

setTimeout(() => {
  const splash = document.getElementById("splashScreen");
  if (splash) splash.style.display = "none";
}, 3000);
