import * as THREE from 'three';

export class Player {
    constructor(scene, camera, world, inventory) {
        this.scene = scene;
        this.camera = camera;
        this.world = world;
        this.inventory = inventory;

        this.health = 10;
        this.maxHealth = 10;
        this.position = new THREE.Vector3(0, 10, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = { x: 0, y: 0 };
        this.isOnGround = false;
        this.isSprinting = false;

        this.moveSpeed = 8;
        this.sprintSpeed = 14;
        this.jumpForce = 12;
        this.gravity = 25;
        this.mouseSensitivity = 0.002;

        this.cameraOffset = new THREE.Vector3(0, 8, 15);
        this.targetCameraOffset = this.cameraOffset.clone();

        this.createPlayerMesh();
        this.createHitbox();
        this.setupControls();
    }

    createPlayerMesh() {
        const bodyGeo = new THREE.BoxGeometry(0.8, 1.6, 0.5);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3498db });
        this.body = new THREE.Mesh(bodyGeo, bodyMat);
        this.body.position.y = 0.8;
        this.body.castShadow = true;

        const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xf5d0c5 });
        this.head = new THREE.Mesh(headGeo, headMat);
        this.head.position.y = 2;
        this.head.castShadow = true;

        const legsGeo = new THREE.BoxGeometry(0.4, 0.8, 0.4);
        const legsMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
        this.legs = new THREE.Mesh(legsGeo, legsMat);
        this.legs.position.y = 0.4;
        this.legs.castShadow = true;

        const leftArmGeo = new THREE.BoxGeometry(0.3, 1, 0.3);
        this.leftArm = new THREE.Mesh(leftArmGeo, bodyMat);
        this.leftArm.position.set(-0.55, 1.2, 0);
        this.leftArm.castShadow = true;

        const rightArmGeo = new THREE.BoxGeometry(0.3, 1, 0.3);
        this.rightArm = new THREE.Mesh(rightArmGeo, bodyMat);
        this.rightArm.position.set(0.55, 1.2, 0);
        this.rightArm.castShadow = true;

        const leftLegGeo = new THREE.BoxGeometry(0.35, 0.9, 0.35);
        this.leftLeg = new THREE.Mesh(leftLegGeo, legsMat);
        this.leftLeg.position.set(-0.2, 0.45, 0);
        this.leftLeg.castShadow = true;

        const rightLegGeo = new THREE.BoxGeometry(0.35, 0.9, 0.35);
        this.rightLeg = new THREE.Mesh(rightLegGeo, legsMat);
        this.rightLeg.position.set(0.2, 0.45, 0);
        this.rightLeg.castShadow = true;

        this.playerGroup = new THREE.Group();
        this.playerGroup.add(this.body, this.head, this.legs, this.leftArm, this.rightArm, this.leftLeg, this.rightLeg);
        this.scene.add(this.playerGroup);

        this.weaponGroup = new THREE.Group();
        this.weaponGroup.position.set(0.7, 1.3, 0.3);
        this.playerGroup.add(this.weaponGroup);
        this.createWeaponMesh();
    }

    createWeaponMesh() {
        const swordGeo = new THREE.BoxGeometry(0.1, 1.2, 0.1);
        const swordMat = new THREE.MeshLambertMaterial({ color: 0xc0c0c0 });
        this.sword = new THREE.Mesh(swordGeo, swordMat);
        this.sword.position.y = -0.5;
        this.weaponGroup.add(this.sword);

        const handleGeo = new THREE.BoxGeometry(0.15, 0.3, 0.15);
        const handleMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.y = 0.15;
        this.weaponGroup.add(handle);
    }

    createHitbox() {
        const hitboxGeo = new THREE.BoxGeometry(0.8, 2, 0.5);
        const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
        this.hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
        this.hitbox.position.y = 1;
        this.playerGroup.add(this.hitbox);
    }

    setupControls() {
        document.addEventListener('click', () => {
            if (!this.inventory.isOpen) {
                document.body.requestPointerLock();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement) {
                this.rotation.y -= e.movementX * this.mouseSensitivity;
                this.rotation.x -= e.movementY * this.mouseSensitivity;
                this.rotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.rotation.x));
            }
        });
    }

    update(delta, keys, mouse) {
        this.updateMovement(delta, keys);
        this.updateCamera(delta);
        this.updateAnimations(delta, keys);
        this.checkGroundCollision();
    }

    updateMovement(delta, keys) {
        const forward = new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(1, 0, 0);

        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);
        right.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);

        const moveDir = new THREE.Vector3(0, 0, 0);

        if (keys['ArrowUp'] || keys['KeyW']) moveDir.add(forward);
        if (keys['ArrowDown'] || keys['KeyS']) moveDir.sub(forward);
        if (keys['ArrowLeft'] || keys['KeyA']) moveDir.sub(right);
        if (keys['ArrowRight'] || keys['KeyD']) moveDir.add(right);

        if (moveDir.length() > 0) {
            moveDir.normalize();
        }

        this.isSprinting = keys['ShiftLeft'] || keys['ShiftRight'];
        const speed = this.isSprinting ? this.sprintSpeed : this.moveSpeed;

        this.velocity.x = moveDir.x * speed;
        this.velocity.z = moveDir.z * speed;

        if ((keys['Space']) && this.isOnGround) {
            this.velocity.y = this.jumpForce;
            this.isOnGround = false;
        }

        this.velocity.y -= this.gravity * delta;

        const newPos = this.position.clone();
        newPos.x += this.velocity.x * delta;
        newPos.y += this.velocity.y * delta;
        newPos.z += this.velocity.z * delta;

        if (!this.checkCollision(newPos)) {
            this.position.copy(newPos);
        } else {
            if (this.velocity.y < 0) {
                this.velocity.y = 0;
                this.isOnGround = true;
            } else {
                this.velocity.y = 0;
            }
        }

        this.playerGroup.position.copy(this.position);
        this.playerGroup.rotation.y = this.rotation.y;
    }

    updateCamera(delta) {
        const idealOffset = this.cameraOffset.clone();
        idealOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.rotation.x);
        idealOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);

        this.targetCameraOffset.lerp(idealOffset, delta * 10);

        const targetPos = this.position.clone().add(this.targetCameraOffset);

        this.camera.position.lerp(targetPos, delta * 8);

        const lookTarget = this.position.clone();
        lookTarget.y += 1.5;
        this.camera.lookAt(lookTarget);
    }

    updateAnimations(delta, keys) {
        const isMoving = keys['ArrowUp'] || keys['ArrowDown'] || keys['ArrowLeft'] || keys['ArrowRight'] ||
                        keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'];

        const walkSpeed = this.isSprinting ? 12 : 6;
        const animSpeed = isMoving ? Math.sin(Date.now() * 0.01 * walkSpeed) * 0.4 : 0;

        this.leftLeg.rotation.x = animSpeed;
        this.rightLeg.rotation.x = -animSpeed;
        this.leftArm.rotation.x = -animSpeed * 0.7;
        this.rightArm.rotation.x = animSpeed * 0.7;

        if (isMoving) {
            this.body.position.y = 0.8 + Math.abs(Math.sin(Date.now() * 0.01 * walkSpeed)) * 0.1;
        } else {
            this.body.position.y = 0.8;
        }
    }

    checkGroundCollision() {
        const checkY = this.position.y - 0.1;
        const blockBelow = this.world.getBlockAt(
            Math.floor(this.position.x),
            Math.floor(checkY),
            Math.floor(this.position.z)
        );

        if (blockBelow && this.velocity.y <= 0) {
            const blockTop = blockBelow.position.y + 0.5;
            if (this.position.y - this.velocity.y * 0.016 <= blockTop) {
                this.position.y = blockTop;
                this.velocity.y = 0;
                this.isOnGround = true;
            }
        }
    }

    checkCollision(pos) {
        const playerRadius = 0.4;
        const checkPositions = [
            { x: pos.x - playerRadius, y: pos.y, z: pos.z },
            { x: pos.x + playerRadius, y: pos.y, z: pos.z },
            { x: pos.x, y: pos.y - 1, z: pos.z },
            { x: pos.x, y: pos.y + 1, z: pos.z },
            { x: pos.x, y: pos.y, z: pos.z - playerRadius },
            { x: pos.x, y: pos.y, z: pos.z + playerRadius }
        ];

        for (const check of checkPositions) {
            const block = this.world.getBlockAt(
                Math.floor(check.x),
                Math.floor(check.y),
                Math.floor(check.z)
            );
            if (block) return true;
        }
        return false;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
        return this.health <= 0;
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }
}