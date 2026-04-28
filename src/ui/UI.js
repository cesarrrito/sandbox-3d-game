export class UI {
    constructor(player, combat) {
        this.player = player;
        this.combat = combat;
        this.notificationTimeout = null;
    }

    init() {
        this.createHearts();
        this.update();
    }

    createHearts() {
        const heartsContainer = document.getElementById('hearts');
        heartsContainer.innerHTML = '';

        for (let i = 0; i < 5; i++) {
            const heart = document.createElement('div');
            heart.className = 'heart';
            heart.id = `heart-${i}`;
            heartsContainer.appendChild(heart);
        }
    }

    update() {
        this.updateHearts();
        requestAnimationFrame(() => this.update());
    }

    updateHearts() {
        const fullHearts = Math.floor(this.player.health / 2);
        const halfHeart = this.player.health % 2 === 1;
        const totalHearts = 5;

        for (let i = 0; i < totalHearts; i++) {
            const heart = document.getElementById(`heart-${i}`);
            if (heart) {
                if (i < fullHearts) {
                    heart.className = 'heart';
                } else if (i === fullHearts && halfHeart) {
                    heart.className = 'heart half';
                } else {
                    heart.className = 'heart empty';
                }
            }
        }
    }

    showNotification(message, duration = 2000) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.classList.add('active');

        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }

        this.notificationTimeout = setTimeout(() => {
            notification.classList.remove('active');
        }, duration);
    }

    updateMobCounter() {
        document.getElementById('mob-count').textContent = this.combat.monsters.length;
    }
}