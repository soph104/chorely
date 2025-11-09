import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("DB2");

const SUPABASE_URL = "https://qrjpcyhvbpxavakmmmpv.supabase.co/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyanBjeWh2YnB4YXZha21tbXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Nzg5OTksImV4cCI6MjA3NzM1NDk5OX0.RtYHYyOFBozohN8SwYFNW0WjGklHaSWbHGlO4Nrp2hk";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


const params = new URLSearchParams(window.location.search);
let householdId = params.get("household");
let userId = params.get("user");
let householdPwd = params.get("pwd");



document.addEventListener("DOMContentLoaded", async () => {
  // === DOM ELEMENTS ===
  const showAddBtn = document.getElementById("show-add-form-btn");
  const addForm = document.getElementById("add-task-form");
  const input = document.getElementById("task-input");
  const daysInput = document.getElementById("days-input");
  const weeksInput = document.getElementById("weeks-input");
  const graceInput = document.getElementById("grace-input");
  const emojiInput = document.getElementById("emoji-input");
  const dueNowCheckbox = document.getElementById("due-now");
  const addBtn = document.getElementById("add-btn");
  const editTaskBtn = document.getElementById("edit-task-btn");
  const dueNowList = document.getElementById("due-now-list");
  const upcomingList = document.getElementById("upcoming-list");
  const allTasksBtn = document.getElementById("all-tasks-btn");
  const upcomingSection = document.getElementById("upcoming-section");


  init();
  // Ensure initial ARIA state
  showAddBtn.setAttribute("aria-expanded", addForm.classList.contains("hidden") ? "false" : "true");

  // === STATE ===
  let isEditMode = false;

  // === EVENT LISTENERS ===

  editTaskBtn.addEventListener("click", () => {
    isEditMode = !isEditMode;
    editTaskBtn.textContent = isEditMode ? "Done" : "Edit";
    loadTasks();
  });

  // Toggle add task form with robust handling
  showAddBtn.addEventListener("click", () => {
    // preferred: toggle the class
    const hadHidden = addForm.classList.contains("hidden");
    addForm.classList.toggle("hidden");

    // If toggling didn't actually change computed visibility (CSS override?), fallback to style
    const computed = window.getComputedStyle(addForm).display;
    if (hadHidden && computed === "none") {
      // still hidden after toggle -> force show
      addForm.classList.remove("hidden");
      addForm.style.display = ""; // let CSS decide (or remove inline override)
    } else if (!hadHidden && computed !== "none") {
      // still visible after toggle -> force hide
      addForm.classList.add("hidden");
      addForm.style.display = "none";
    } else {
      // normal case: remove any inline style fallback
      addForm.style.removeProperty("display");
    }

    // Update button label and aria
    const isVisible = window.getComputedStyle(addForm).display !== "none";
    showAddBtn.textContent = isVisible ? "Close" : "New";
    showAddBtn.setAttribute("aria-expanded", isVisible ? "true" : "false");

    console.log("Toggled add form. visible:", isVisible, "classList contains hidden:", addForm.classList.contains("hidden"));
  });

  // Toggle upcoming tasks visibility
  allTasksBtn.addEventListener("click", () => {
    upcomingSection.classList.toggle("hidden");
  });

  // Add new task
  addBtn.addEventListener("click", addTask);



  // === FUNCTIONS ===

  async function init() {
    // Household selection / creation
    if (!householdId) {
      let householdName = prompt("Enter your household name:");
      // Query Supabase for that household
      const { data: household, error } = await supabase
        .from("households")
        .select("*")
        .eq("name", householdName)
        .maybeSingle(); // returns single row or null

      if (error) {
        console.error("Error fetching household:", error);
        return;
      }

      if (household) {
        // Ask for password if exists
        if (household.password) {
          let pwdAttempt = prompt("Enter household password:");
          while (pwdAttempt !== household.password) {
            pwdAttempt = prompt("Incorrect password. Try again:");
          }
          householdPwd = pwdAttempt;
        }
      } else {
        // New household password
        householdPwd = prompt("Create a password (optional):") || "";

        const { data: newHousehold, error } = await supabase
          .from("households")
          .insert([{ name: householdName, password: householdPwd }])
          .select()
          .single();

        if (error) {
          console.error("Failed to create household:", error);
          return;
        }

        household = newHousehold;
        console.log("Created household:", household);
      }

      householdId = household.id;

      // Save to URL
      const newParams = new URLSearchParams();
      newParams.set("household", householdId);
      window.history.replaceState({}, "", "?" + newParams.toString());
    }

    // Now load tasks scoped to this household
    loadTasks(householdId);
  }

  async function loadTasks(householdId) {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("household_id", householdId)
      .order("next_due", { ascending: true });

    if (error) return console.error(error);
    renderTasks(data);
  }

  function renderTasks(tasks) {
    dueNowList.innerHTML = "";
    upcomingList.innerHTML = "";

    const today = new Date();

    tasks.forEach((task) => {
      const nextDue = new Date(task.next_due);
      const grace = task.grace_period || 0;
      const dueDateWithGrace = new Date(nextDue);
      dueDateWithGrace.setDate(dueDateWithGrace.getDate() + grace);

      const isOverdue = today > dueDateWithGrace;
      const isDueNow = today >= nextDue && today <= dueDateWithGrace;
      const weekday = nextDue.toLocaleDateString("en-US", { weekday: "short" });

      const li = document.createElement("li");
      li.innerHTML = `
        <span class="emoji">${task.emoji || "⬜"}</span>
        <div class="task-info">
          <strong>${task.title}</strong><br>
          <small>${weekday}, ${nextDue.toLocaleDateString()}</small>
        </div>
      `;

      const buttonContainer = document.createElement("div");

      const completeButton = document.createElement("button");
      completeButton.textContent = "✅";
      completeButton.addEventListener("click", () =>
        completeTask(task.id, task.interval_days)
      );

      const editButton = document.createElement("button");
      editButton.textContent = "✏️";
      editButton.addEventListener("click", () => editTask(task.id));

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "🗑️";
      deleteButton.addEventListener("click", () => deleteTask(task.id));

      // Hide or show based on edit mode
      if (!isEditMode) {
        editButton.classList.add("hidden");
        deleteButton.classList.add("hidden");
      }

      buttonContainer.appendChild(completeButton);
      buttonContainer.appendChild(editButton);
      buttonContainer.appendChild(deleteButton);

      li.appendChild(buttonContainer);

      if (isDueNow || isOverdue) {
        li.classList.add(isOverdue ? "overdue" : "due-now");
        dueNowList.appendChild(li);
      } else {
        upcomingList.appendChild(li);
      }
    });
  }

  async function addTask() {
    console.log("Add task called");
    const title = input.value.trim();
    const intervalDays = parseInt(daysInput.value) || 0;
    const intervalWeeks = parseInt(weeksInput.value) || 0;
    const interval = intervalDays + intervalWeeks * 7;
    const grace = parseInt(graceInput.value) || 0;
    const emoji = emojiInput.value || "";
    const dueNow = dueNowCheckbox.checked ? "yes" : "no";

    if (!title || !interval) return alert("Enter task and interval");

    const nextDue = new Date();
    if (dueNow === "no") nextDue.setDate(nextDue.getDate() + interval);

    const { error } = await supabase.from("tasks").insert([
      {
        title,
        interval_days: interval,
        next_due: nextDue.toISOString().slice(0, 10),
        due: dueNow,
        grace_period: grace,
        emoji,
      },
    ]);

    if (error) return console.error(error);

    // Reset form
    input.value = "";
    daysInput.value = "";
    weeksInput.value = "";
    graceInput.value = "";
    emojiInput.value = "";
    dueNowCheckbox.checked = false;

    // hide the form and update button
    addForm.classList.add("hidden");
    addForm.style.display = "none";
    showAddBtn.textContent = "New";
    showAddBtn.setAttribute("aria-expanded", "false");

    loadTasks();
  }

  async function completeTask(id, interval) {
    console.log("Complete task clicked", { id, interval });
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + interval);

    const { error } = await supabase
      .from("tasks")
      .update({ next_due: nextDue.toISOString().slice(0, 10), due: "no" })
      .eq("id", id);

    if (error) return console.error(error);
    loadTasks();
  }

  async function deleteTask(id) {
    console.log("Delete task clicked", { id });
    if (!confirm("Are you sure you want to delete this task?")) return;

    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) return console.error(error);
    loadTasks();
  }

  async function editTask(id) {
    console.log("Edit task clicked", { id });
    const { data } = await supabase.from("tasks").select("*").eq("id", id).single();
    if (!data) return;

    const newTitle = prompt("Task title:", data.title) || data.title;
    const newInterval =
      parseInt(prompt("Interval (days):", data.interval_days)) ||
      data.interval_days;
    const newGrace =
      parseInt(prompt("Grace period (days):", data.grace_period)) ||
      data.grace_period;
    const newEmoji = prompt("Emoji:", data.emoji) || data.emoji;

    const { error } = await supabase
      .from("tasks")
      .update({
        title: newTitle,
        interval_days: newInterval,
        grace_period: newGrace,
        emoji: newEmoji,
      })
      .eq("id", id);

    if (error) return console.error(error);
    loadTasks();
  }

  // Expose for inline handlers
  window.completeTask = completeTask;
  window.deleteTask = deleteTask;
  window.editTask = editTask;

  // Load tasks initially
  loadTasks();

  // Real-time updates
  supabase
    .channel("tasks-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, loadTasks)
    .subscribe();

});