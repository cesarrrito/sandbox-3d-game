import * as THREE from 'three';

const MONSTER_TYPES = {
    ZOMBIE: { name: 'Zombie', color: 0x2ecc71, health: 6, damage: 2, speed: 3, attackSpeed: 1 },
    SKELETON: { name: 'Squelette', color: 0xecf0f1, health: 6, damage: 2, speed: 2.5, attackSpeed: 0.8 },
    BOSS: { name: 'Boss', color: 0x9b59b6, health: 20, damage: 1, speed: 1.5, attackSpeed: 2, isBoss: true }
};

export class Combat {
    constructor(scene, world, player, inventory) {
        this.scene = scene;
        this.world = world;
        this.player = player;
        this.inventory = inventory;
        this.monsters = [];
        this.projectiles = [];
        this.attackCooldown = 0;
        this.lastSpawnTime = 0;
        this.lastBossSpawnTime = 0;
        this.spawnInterval = 60000;
        this.bossInterval = 300000;
        this.monstersPerSpawn = 1;
        this.spawnRadius = 50;
        this.mobCounter = 0;
    }

    init() {
        this.spawnInitialMonsters();
    }

    spawnInitialMonsters() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => this.spawnMonster(), i * 500);
        }
    }

    spawnMonster(isBoss = false) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 20;
        const x = this.player.position.x + Math.cos(angle) * distance;
        const z = this.player.position.z + Math.sin(angle) * distance;

        const groundY = this.findGroundLevel(x, z);
        if (groundY === -1) return;

        const monsterType = isBoss ? MONSTER_TYPES.BOSS : MONSTER_TYPES.ZOMBIE;
        const monster = this.createMonster(monsterType, x, groundY + 1, z, isBoss);
        this.monsters.push(monster);
        this.mobCounter++;
        this.updateMobCounter();
    }

    createMonster(type, x, y, z, isBoss = false) {
        const group = new THREE.Group();

        const scale = isBoss ? 1.5 : 1;
        const bodyGeo = new THREE.BoxGeometry(0.8 * scale, 1.4 * scale, 0.5 * scale);
        const bodyMat = new THREE.MeshLambertMaterial({ color: type.color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.7 * scale;
        body.castShadow = true;
        group.add(body);

        const headGeo = new THREE.BoxGeometry(0.6 * scale, 0.6 * scale, 0.6 * scale);
        const headMat = new THREE.MeshLambertMaterial({ color: type.color });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.7 * scale;
        head.castShadow = true;
        group.add(head);

        const eyesGeo = new THREE.BoxGeometry(0.15 * scale, 0.1 * scale, 0.1 * scale);
        const eyesMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const leftEye = new THREE.Mesh(eyesGeo, eyesMat);
        leftEye.position.set(-0.15 * scale, 1.75 * scale, -0.3 * scale);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(eyesGeo, eyesMat);
        rightEye.position.set(0.15 * scale, 1.75 * scale, -0.3 * scale);
        group.add(rightEye);

        group.position.set(x, y, z);
        this.scene.add(group);

        return {
            mesh: group,
            type: type,
            health: type.health,
            maxHealth: type.health,
            isBoss: isBoss,
            lastAttackTime: 0,
            velocity: new THREE.Vector3(0, 0, 0)
        };
    }

    findGroundLevel(x, z) {
        for (let y = 50; y >= 0; y--) {
            const block = this.world.getBlockAt(Math.floor(x), y, Math.floor(z));
            if (block) return y;
        }
        return -1;
    }

    update(delta) {
        this.updateMonsterSpawning(delta);
        this.updateMonsters(delta);
        this.updateProjectiles(delta);
        this.updateCooldowns(delta);
    }

    updateMonsterSpawning(delta) {
        const now = Date.now();

        if (now - this.lastSpawnTime > this.spawnInterval) {
            this.spawnMonster();
            this.lastSpawnTime = now;
        }

        if (now - this.lastBossSpawnTime > this.bossInterval) {
            this.spawnMonster(true);
            this.lastBossSpawnTime = now;
        }
    }

    updateMonsters(delta) {
        for (let i = this.monsters.length - 1; i >= 0; i--) {
            const monster = this.monsters[i];

            if (monster.health <= 0) {
                this.removeMonster(monster, i);
                continue;
            }

            this.moveMonster(monster, delta);
            this.checkMonsterAttack(monster, delta);
            this.checkPlayerAttack(monster);
        }
    }

    moveMonster(monster, delta) {
        const toPlayer = new THREE.Vector3();
        toPlayer.subVectors(this.player.position, monster.mesh.position);
        toPlayer.y = 0;
        const distance = toPlayer.length();

        if (distance > 2) {
            toPlayer.normalize();
            const speed = monster.type.speed;
            monster.mesh.position.x += toPlayer.x * speed * delta;
            monster.mesh.position.z += toPlayer.z * speed * delta;

            const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
            monster.mesh.rotation.y = targetAngle;
        }

        const groundY = this.findGroundLevel(monster.mesh.position.x, monster.mesh.position.z);
        if (groundY !== -1) {
            monster.mesh.position.y = groundY + 1;
        }
    }

    checkMonsterAttack(monster, delta) {
        const toPlayer = new THREE.Vector3();
        toPlayer.subVectors(this.player.position, monster.mesh.position);
        toPlayer.y = 0;
        const distance = toPlayer.length();

        const attackRange = monster.isBoss ? 4 : 2;
        const now = Date.now();

        if (distance < attackRange && now - monster.lastAttackTime > 1000 / monster.type.attackSpeed) {
            monster.lastAttackTime = now;
            this.player.takeDamage(monster.type.damage);

            const damageOverlay = document.getElementById('damage-overlay');
            damageOverlay.classList.add('active');
            setTimeout(() => damageOverlay.classList.remove('active'), 100);

            if (this.player.health <= 0) {
                this.onPlayerDeath();
            }
        }
    }

    checkPlayerAttack(monster) {
        if (!this.inventory.isOpen && this.inventory.selectedItem?.type === 'sword' && this.attackCooldown <= 0) {
            const toMonster = new THREE.Vector3();
            toMonster.subVectors(monster.mesh.position, this.player.position);
            toMonster.y = 0;
            const distance = toMonster.length();

            if (distance < 3) {
                this.attackMonster(monster, 4);
                this.attackCooldown = 0.5;
            }
        }

        if (!this.inventory.isOpen && this.inventory.selectedItem?.type === 'bow' && this.attackCooldown <= 0) {
            const toMonster = new THREE.Vector3();
            toMonster.subVectors(monster.mesh.position, this.player.position);
            toMonster.y = 0;
            const distance = toMonster.length();

            if (distance < 50) {
                this.fireArrow(monster);
                this.attackCooldown = 1;
            }
        }
    }

    attackMonster(monster, damage) {
        monster.health -= damage;

        const knockback = 2;
        const dir = new THREE.Vector3();
        dir.subVectors(monster.mesh.position, this.player.position).normalize();
        monster.mesh.position.x += dir.x * knockback;
        monster.mesh.position.z += dir.z * knockback;

        if (monster.health <= 0) {
            this.onMonsterDeath(monster);
        }
    }

    fireArrow(target) {
        const arrow = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.1, 0.5),
            new THREE.MeshBasicMaterial({ color: 0xdeb887 })
        );

        const startPos = this.player.position.clone();
        startPos.y += 1.5;
        arrow.position.copy(startPos);

        const direction = new THREE.Vector3();
        direction.subVectors(target.mesh.position, startPos).normalize();

        arrow.userData = {
            velocity: direction.multiplyScalar(50),
            lifetime: 2
        };

        this.scene.add(arrow);
        this.projectiles.push(arrow);
    }

    updateProjectiles(delta) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.position.add(proj.userData.velocity.clone().multiplyScalar(delta));
            proj.userData.lifetime -= delta;

            if (proj.userData.lifetime <= 0) {
                this.scene.remove(proj);
                this.projectiles.splice(i, 1);
                continue;
            }

            for (const monster of this.monsters) {
                const dist = proj.position.distanceTo(monster.mesh.position);
                if (dist < 1.5) {
                    this.attackMonster(monster, 2);
                    this.scene.remove(proj);
                    this.projectiles.splice(i, 1);
                    break;
                }
            }
        }
    }

    updateCooldowns(delta) {
        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta;
        }
    }

    removeMonster(monster, index) {
        this.scene.remove(monster.mesh);
        this.monsters.splice(index, 1);
    }

    onMonsterDeath(monster) {
        const loot = [
            { type: 'potion', chance: 0.3 },
            { type: 'sword', chance: 0.1 },
            { type: 'bow', chance: 0.1 }
        ];

        for (const item of loot) {
            if (Math.random() < item.chance) {
                this.inventory.addItem(item.type, 1);
            }
        }

        if (monster.isBoss) {
            this.inventory.addItem('sword', 1);
            this.inventory.addItem('potion', 3);
        }
    }

    onPlayerDeath() {
        setTimeout(() => {
            this.player.health = this.player.maxHealth;
            this.player.position.set(0, 10, 0);
        }, 1000);
    }

    updateMobCounter() {
        document.getElementById('mob-count').textContent = this.mobCounter;
    }
}