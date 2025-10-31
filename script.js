const input = document.getElementById("task-input");
const addBtn = document.getElementById("add-btn");
const list = document.getElementById("task-list");

function loadTasks() {
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  list.innerHTML = "";
  tasks.forEach((task, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${task}</span>
      <button onclick="deleteTask(${i})">❌</button>
    `;
    list.appendChild(li);
  });
}

function addTask() {
  const task = input.value.trim();
  if (!task) return;
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  tasks.push(task);
  localStorage.setItem("tasks", JSON.stringify(tasks));
  input.value = "";
  loadTasks();
}

function deleteTask(index) {
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  tasks.splice(index, 1);
  localStorage.setItem("tasks", JSON.stringify(tasks));
  loadTasks();
}

addBtn.addEventListener("click", addTask);
window.addEventListener("load", loadTasks);
