const cron = require('node-cron');

class TaskService {
  initialize() {
    console.log('Initialisation du TaskService...');
  }

  scheduleTask(cronExpression, taskName, payload = {}) {
    console.log(`Programmation de la tâche ${taskName} avec cron ${cronExpression}`);
    const job = cron.schedule(cronExpression, () => {
      console.log(`Exécution de la tâche programmée: ${taskName}`);
      // Ici on pourrait dispatcher à l'agent concerné
    });
    return job;
  }
}

module.exports = TaskService;
