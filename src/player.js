const players = {};

const FRAMES_PER_SECOND = 30; // per 1000ms
const INTERVAL = 1000 / FRAMES_PER_SECOND;

const linkPlayer = (id, player) => {
  players[id] = player;
};
const removePlayer = (id) => delete players[id];
const getPlayer = (id) => {
  return players[id];
};
const resetPlayers = () => {
  Object.keys(players).forEach((id) => {
    players[id].play(players[id].default, 0);
  });
};

const animation = {
  timer: null,
  tasks: {},
  playAnimation: (action, playerIds, callback) => {
    if (!playerIds) {
      playerIds = Object.keys(players);
    }
    playerIds.forEach((id) => {
      animation.tasks[id] = {
        action,
        status: 'running',
        player: players[id],
        callback,
      };
    });
    const frame = () => {
      const taskIds = Object.keys(animation.tasks);
      if (taskIds.length > 0) {
        taskIds.forEach((id) => {
          const task = animation.tasks[id];
          if (task.action === task.status) {
            const cb = task.callback;
            if (typeof cb === 'function') cb();
            delete animation.tasks[id];
          } else {
            task.status = task.player.play(task.action);
          }
        });

        window.requestAnimationFrame(frame);
      }
    };
    frame();
    // if (!animation.timer) {
    //   animation.timer = setInterval(() => {
    //     const taskIds = Object.keys(animation.tasks);
    //     if (taskIds.length === 0) {
    //       clearInterval(animation.timer);
    //       animation.timer = null;
    //       return;
    //     }
    //     taskIds.forEach((id) => {
    //       const task = animation.tasks[id];
    //       if (task.action === task.status) {
    //         delete animation.tasks[id];
    //       } else {
    //         task.status = task.player.play(task.action);
    //       }
    //     });
    //   }, INTERVAL);
    // }
  },
  linkPlayer,
  getPlayer,
  resetPlayers,
  removePlayer,
};

class Player {
  constructor(name, status, length = 1500) {
    this.name = name;
    this.actions = [];
    this.stepper = {
      open: (p) => ++p,
      close: (p) => --p,
    };
    this.status = status;
    this.default = status;
    this.progress = 0;
    this.length = length;
    this.frames = (this.length / 1000) * FRAMES_PER_SECOND || 1;
  }

  play(type, progress = undefined) {
    if (type !== this.status) {
      const stepper = this.stepper[type];
      if (progress !== undefined) {
        this.progress = progress;
      } else if (stepper) {
        this.progress = stepper(this.progress);
        if (this.progress > this.frames) {
          this.progress = this.frames;
          this.status = type;
          return this.status;
        }
        if (this.progress < 0) {
          this.progress = 0;
          this.status = type;
          return this.status;
        }
        this.status = null;
      }
      this.actions.forEach((run) => {
        run(this.progress, this.frames);
      });
    }
    return this.status;
  }

  setStepper(name, func) {
    this.stepper[name] = func;
  }

  addAction(action) {
    this.actions.push(action);
  }
}

export { animation, Player };
