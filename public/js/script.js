document.addEventListener('DOMContentLoaded', function() {
 
    const darkModeToggle = document.getElementById('darkModeToggle');
    const html = document.documentElement;
    
   
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        html.setAttribute('data-bs-theme', 'dark');
        darkModeToggle.checked = true;
    }
    
    darkModeToggle.addEventListener('change', function() {
        if (this.checked) {
            html.setAttribute('data-bs-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            html.setAttribute('data-bs-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    });
    
  
    document.querySelectorAll('.task-status').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const taskId = this.closest('tr').getAttribute('data-id');
            const status = this.checked ? 'completed' : 'pending';
            
            fetch(`/tasks/${taskId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status })
            })
            .then(response => response.json())
            .then(data => {
                location.reload();
            })
            .catch(error => {
                console.error('Error:', error);
            });
        });
    });
    
document.addEventListener('click', async (e) => {
  if (e.target.classList.contains('delete-task') || 
      e.target.closest('.delete-task')) {
    const deleteBtn = e.target.classList.contains('delete-task') 
      ? e.target 
      : e.target.closest('.delete-task');
    const taskRow = deleteBtn.closest('tr');
    const taskId = taskRow.dataset.id;

    if (confirm('Are you sure you want to delete this task?')) {
      try {
        const response = await fetch(`/tasks/${taskId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete task');
        }

       
        taskRow.style.opacity = '0';
        setTimeout(() => taskRow.remove(), 300);
        
      
        showAlert('Task deleted successfully!', 'success');
        
      } catch (err) {
        console.error('Delete error:', err);
        showAlert(err.message, 'danger');
      }
    }
  }
});


function showAlert(message, type) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(alertDiv);
  setTimeout(() => alertDiv.remove(), 5000);
}
  
 document.getElementById('saveTask').addEventListener('click', async function() {
  const taskData = {
    title: document.getElementById('taskTitle').value,
    description: document.getElementById('taskDescription').value,
    dueDate: document.getElementById('taskDueDate').value,
    priority: document.getElementById('taskPriority').value,
    category: document.getElementById('taskCategory').value
  };

  try {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData)
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to save task');
    }

   
    bootstrap.Modal.getInstance(document.getElementById('taskModal')).hide();
    location.reload();
    
  } catch (err) {
    console.error('Error:', err);
    alert(`Error: ${err.message}\n\nCheck console for details`);
  }
});
    
   
document.getElementById('getSuggestions').addEventListener('click', async function() {
  const promptInput = document.getElementById('aiPrompt');
  const suggestionsContainer = document.getElementById('suggestions');
  const button = this;
  

  if (!promptInput.value.trim()) {
    showAlert('Please describe what you need help with', 'warning');
    promptInput.focus();
    return;
  }

  try {
   
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Thinking...';
    suggestionsContainer.innerHTML = '<div class="text-center my-3"><div class="spinner-border text-purple"></div></div>';

  
    const currentTasks = Array.from(document.querySelectorAll('#taskList tr'))
      .map(row => row.querySelector('h5').textContent)
      .join(', ');

 
    const response = await fetch('/api/suggest-tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentTasks: currentTasks || 'No current tasks',
        prompt: promptInput.value.trim()
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get suggestions');
    }

    const { suggestions } = await response.json();
    displaySuggestions(suggestions);

  } catch (error) {
    console.error('AI Error:', error);
    suggestionsContainer.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i> ${error.message}
      </div>
    `;
  } finally {
    button.disabled = false;
    button.innerHTML = '<i class="bi bi-robot"></i> Get Suggestions';
  }
});

function displaySuggestions(suggestionsText) {
  const suggestionsContainer = document.getElementById('suggestions');
  

  const htmlSuggestions = suggestionsText
    .split('\n')
    .filter(line => line.trim())
    .map(line => `
      <div class="suggestion-item d-flex align-items-start mb-2">
        <i class="bi bi-check-circle text-purple me-2 mt-1"></i>
        <div>${line.replace(/^\s*[\•\-]\s*/, '').trim()}</div>
      </div>
    `)
    .join('');

  suggestionsContainer.innerHTML = `
    <div class="suggestions-list mb-3">
      ${htmlSuggestions}
    </div>
    <button class="btn btn-sm btn-purple" id="addAllSuggestions">
      <i class="bi bi-plus-circle"></i> Add All to Tasks
    </button>
  `;

  document.getElementById('addAllSuggestions').addEventListener('click', () => {
    addTasksFromSuggestions(suggestionsText);
  });
}

function addTasksFromSuggestions(suggestionsText) {
  const tasksToAdd = suggestionsText
    .split('\n')
    .filter(line => line.trim())
    .map(line => line.replace(/^\s*[\•\-]\s*/, '').trim());

  tasksToAdd.forEach(async (taskTitle) => {
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: taskTitle,
          priority: 'medium'
        })
      });
    } catch (error) {
      console.error('Error adding task:', error);
    }
  });

  showAlert(`${tasksToAdd.length} tasks added successfully!`, 'success');
  setTimeout(() => location.reload(), 1500);
}

function showAlert(message, type) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
  alertDiv.style.zIndex = '1000';
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(alertDiv);
  setTimeout(() => alertDiv.remove(), 5000);
}
  
    document.getElementById('aiHelpBtn').addEventListener('click', function() {
        const currentTasks = Array.from(document.querySelectorAll('#taskList tr')).map(tr => {
            return tr.querySelector('h5').textContent;
        }).join(', ');
        
        document.getElementById('aiPrompt').value = 
            `I currently have these tasks: ${currentTasks}. Can you suggest how to prioritize my day and any additional tasks I might need?`;
        
  
        document.querySelector('.col-md-4').scrollIntoView({ behavior: 'smooth' });
    });
});
