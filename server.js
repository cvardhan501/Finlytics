const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log("❌ MongoDB error:", err.message));

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  budget: { type: Number, default: 0 },
  savingsGoal: { type: Number, default: 0 }
});

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    category: { type: String, required: true },
    date: {
      type: String,
      default: () => new Date().toISOString().split("T")[0]
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const Transaction = mongoose.model("Transaction", transactionSchema);

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

app.get("/", (req, res) => {
  res.send("Finlytics Backend Running 🚀");
});

app.post("/register", async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const existing = await User.findOne({ name });

    if (existing) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      password: hashedPassword
    });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Registered successfully",
      token,
      userId: user._id,
      name: user.name
    });
  } catch {
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { name, password } = req.body;

    const user = await User.findOne({ name });

    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) return res.status(400).json({ error: "Wrong password" });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      userId: user._id,
      name: user.name
    });
  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/transactions", auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.userId }).sort({
      date: -1,
      createdAt: -1
    });

    res.json(transactions);
  } catch {
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

app.post("/transactions", auth, async (req, res) => {
  try {
    const { title, amount, type, category, date } = req.body;

    if (!title || !amount || !type || !category) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const transaction = await Transaction.create({
      userId: req.userId,
      title,
      amount: Number(amount),
      type,
      category,
      date: date || new Date().toISOString().split("T")[0]
    });

    res.json({
      message: "Transaction added successfully",
      transaction
    });
  } catch {
    res.status(500).json({ error: "Failed to add transaction" });
  }
});

app.delete("/transactions/:id", auth, async (req, res) => {
  try {
    await Transaction.deleteOne({
      _id: req.params.id,
      userId: req.userId
    });

    res.json({ message: "Transaction deleted successfully" });
  } catch {
    res.status(500).json({ error: "Delete failed" });
  }
});

app.delete("/transactions", auth, async (req, res) => {
  try {
    await Transaction.deleteMany({ userId: req.userId });
    res.json({ message: "All transactions cleared successfully" });
  } catch {
    res.status(500).json({ error: "Clear all failed" });
  }
});

app.post("/budget", auth, async (req, res) => {
  try {
    const { budget } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { budget: Number(budget) },
      { new: true }
    );

    res.json({
      message: "Budget updated successfully",
      budget: user.budget
    });
  } catch {
    res.status(500).json({ error: "Budget update failed" });
  }
});

app.post("/savings-goal", auth, async (req, res) => {
  try {
    const { savingsGoal } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { savingsGoal: Number(savingsGoal) },
      { new: true }
    );

    res.json({
      message: "Savings goal updated successfully",
      savingsGoal: user.savingsGoal
    });
  } catch {
    res.status(500).json({ error: "Savings goal update failed" });
  }
});

app.get("/summary", auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.userId });
    const user = await User.findById(req.userId);

    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);

    const expense = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);

    const budget = user?.budget || 0;
    const savingsGoal = user?.savingsGoal || 0;
    const balance = income - expense;

    res.json({
      income,
      expense,
      balance,
      budget,
      savingsGoal,
      remainingBudget: budget - expense,
      budgetUsed: budget > 0 ? (expense / budget) * 100 : 0,
      budgetExceeded: budget > 0 && expense > budget,
      savingsProgress: savingsGoal > 0 ? (balance / savingsGoal) * 100 : 0
    });
  } catch {
    res.status(500).json({ error: "Summary failed" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});