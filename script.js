import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://qrjpcyhvbpxavakmmmpv.supabase.co/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyanBjeWh2YnB4YXZha21tbXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Nzg5OTksImV4cCI6MjA3NzM1NDk5OX0.RtYHYyOFBozohN8SwYFNW0WjGklHaSWbHGlO4Nrp2hk";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const input = document.getElementById("task-input");
const daysInput = document.getElementById("days-input");
const addBtn = document.getElementById("add-btn");
const list = document.getElementById("task-list");

console.log("Supabase Client:", supabase);

async function loadTasks() {
  const { data, error } = await supabase.from("tasks").select("*").order("next_due", { ascending: true });
  if (error) return console.error(error);
  renderTasks(data);
}

function renderTasks(tasks) {
  list.innerHTML = "";
  const today = new Date();
  tasks.forEach(task => {
    const dueDate = new Date(task.next_due);
    const overdue = dueDate < today ? "overdue" : "";
    const li = document.createElement("li");
    li.classList.add(overdue);
    li.innerHTML = `
      <div>
        <strong>${task.title}</strong><br>
        <small>Next due: ${dueDate.toLocaleDateString()}</small>
      </div>
      <button onclick="completeTask(${task.id}, ${task.interval_days})">✅ Done</button>
    `;
    list.appendChild(li);
  });
}

async function addTask() {
  const title = input.value.trim();
  const interval = parseInt(daysInput.value);
  if (!title || !interval) return alert("Enter task and interval");

  const nextDue = new Date();
  nextDue.setDate(nextDue.getDate() + interval);

  const { error } = await supabase.from("tasks").insert([
    { title, interval_days: interval, next_due: nextDue.toISOString().slice(0, 10), done: false }
  ]);
  if (error) console.error(error);
  input.value = "";
  daysInput.value = "";
  loadTasks();
}

window.completeTask = async function(id, interval) {
  const nextDue = new Date();
  nextDue.setDate(nextDue.getDate() + interval);
  const { error } = await supabase
    .from("tasks")
    .update({ next_due: nextDue.toISOString().slice(0, 10), done: false })
    .eq("id", id);
  if (error) console.error(error);
  loadTasks();
};

addBtn.addEventListener("click", addTask);
loadTasks();

// Optional: Real-time sync
supabase.channel("tasks-changes")
  .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, loadTasks)
  .subscribe();
