import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("DB2");

const SUPABASE_URL = "https://qrjpcyhvbpxavakmmmpv.supabase.co/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyanBjeWh2YnB4YXZha21tbXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Nzg5OTksImV4cCI6MjA3NzM1NDk5OX0.RtYHYyOFBozohN8SwYFNW0WjGklHaSWbHGlO4Nrp2hk";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM elements
const showAddBtn = document.getElementById("show-add-form-btn");
const addForm = document.getElementById("add-task-form");
const input = document.getElementById("task-input");
const daysInput = document.getElementById("days-input");
const weeksInput = document.getElementById("weeks-input");
const graceInput = document.getElementById("grace-input");
const emojiInput = document.getElementById("emoji-input");
const dueNowCheckbox = document.getElementById("due-now");
const addBtn = document.getElementById("add-btn");

const dueNowList = document.getElementById("due-now-list");
const upcomingList = document.getElementById("upcoming-list");

// Toggle add task form
showAddBtn.addEventListener("click", () => {
  addForm.classList.toggle("hidden");
});

// Load tasks
async function loadTasks() {
  const { data, error } = await supabase.from("tasks").select("*").order("next_due", { ascending: true });
  if (error) return console.error(error);
  renderTasks(data);
}

// Render tasks into two sections
function renderTasks(tasks) {
  dueNowList.innerHTML = "";
  upcomingList.innerHTML = "";
  const today = new Date();

  tasks.forEach(task => {
    const nextDue = new Date(task.next_due);
    const grace = task.grace_period || 0;
    const dueDateWithGrace = new Date(nextDue);
    dueDateWithGrace.setDate(dueDateWithGrace.getDate() + grace);
    const isOverdue = task.due === "yes" && today > dueDateWithGrace;

    const li = document.createElement("li");
    if (task.due === "yes" && !isOverdue) li.classList.add("due-now");
    else if (isOverdue) li.classList.add("overdue");

    li.innerHTML = `
      <span class="emoji">${task.emoji || "⬜"}</span>
      <div class="task-info">
        <strong>${task.title}</strong><br>
        <small>Next due: ${nextDue.toLocaleDateString()}</small>
        <small>Grace: ${grace} day(s)</small>
      </div>
      <div>
        <button onclick="completeTask(${task.id}, ${task.interval_days})">✅</button>
        <button onclick="editTask(${task.id})">✏️</button>
        <button onclick="deleteTask(${task.id})">🗑️</button>
      </div>
    `;

    if (task.due === "yes" || isOverdue) dueNowList.appendChild(li);
    else upcomingList.appendChild(li);
  });
}

// Add new task
async function addTask() {
  console.log("Addtask called")
  const title = input.value.trim();
  const interval = parseInt(daysInput.value) + parseInt(weeksInput.value)*7 || 0;
  const grace = parseInt(graceInput.value) || 0;
  const emoji = emojiInput.value || ""; //Default emoji todo
  const dueNow = dueNowCheckbox.checked ? "yes" : "no";

  if (!title || !interval) return alert("Enter task and interval");

  const nextDue = new Date();
  if (dueNow === "no") nextDue.setDate(nextDue.getDate() + interval);

  const { error } = await supabase.from("tasks").insert([
    { title, interval_days: interval, next_due: nextDue.toISOString().slice(0,10), due: dueNow, grace_period: grace, emoji }
  ]);

  if (error) return console.error(error);

  input.value = "";
  daysInput.value = "";
  graceInput.value = "";
  emojiInput.value = "";
  dueNowCheckbox.checked = false;
  loadTasks();
}

// Complete task
window.completeTask = async function(id, interval) {
  const nextDue = new Date();
  nextDue.setDate(nextDue.getDate() + interval);

  const { error } = await supabase.from("tasks")
    .update({ next_due: nextDue.toISOString().slice(0,10), due: "no" })
    .eq("id", id);

  if (error) return console.error(error);
  loadTasks();
};

// Delete task
window.deleteTask = async function(id) {
  if (!confirm("Are you sure you want to delete this task?")) return;
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return console.error(error);
  loadTasks();
};

// Edit task (inline prompt)
window.editTask = async function(id) {
  const { data } = await supabase.from("tasks").select("*").eq("id", id).single();
  if (!data) return;

  const newTitle = prompt("Task title:", data.title) || data.title;
  const newInterval = parseInt(prompt("Interval (days):", data.interval_days)) || data.interval_days;
  const newGrace = parseInt(prompt("Grace period (days):", data.grace_period)) || data.grace_period;
  const newEmoji = prompt("Emoji:", data.emoji) || data.emoji;

  const { error } = await supabase.from("tasks").update({
    title: newTitle,
    interval_days: newInterval,
    grace_period: newGrace,
    emoji: newEmoji
  }).eq("id", id);

  if (error) return console.error(error);
  loadTasks();
};

// Event listener
addBtn.addEventListener("click", addTask);
loadTasks();

// Real-time updates
supabase.channel("tasks-changes")
  .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, loadTasks)
  .subscribe();
