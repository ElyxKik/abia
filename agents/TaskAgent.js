const TaskService = require('../services/task-service');

class TaskAgent {
  constructor() {
    this.taskService = new TaskService();
    this.initialized = false;
  }

  initialize() {
    this.taskService.initialize();
    this.initialized = true;
    console.log('Agent Task initialisé');
    return true;
  }

  schedule(cronExpression, taskName, payload) {
    return this.taskService.scheduleTask(cronExpression, taskName, payload);
  }
}

module.exports = TaskAgent;
