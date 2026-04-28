import * as THREE from 'three';
import { World } from './world/World.js';
import { Player } from './player/Player.js';
import { Inventory } from './inventory/Inventory.js';
import { Combat } from './combat/Combat.js';
import { UI } from './ui/UI.js';

class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        this.world = null;
        this.player = null;
        this.inventory = null;
        this.combat = null;
        this.ui = null;
        this.isRunning = false;
        this.keys = {};
        this.mouse = { x: 0, y: 0, left: false, right: false };
        this.raycaster = new THREE.Raycaster();
        this.targetBlock = null;
        this.targetFace = null;
    }

    async init() {
        this.setupRenderer();
        this.setupScene();
        this.setupLighting();
        this.setupEventListeners();
        await this.setupGame();
        this.hideLoadingScreen();
        this.isRunning = true;
        this.animate();
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').appendChild(this.renderer.domElement);
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 15, 30);
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(100, 100, 50);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 500;
        sunLight.shadow.camera.left = -100;
        sunLight.shadow.camera.right = 100;
        sunLight.shadow.camera.top = 100;
        sunLight.shadow.camera.bottom = -100;
        this.scene.add(sunLight);
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));
        window.addEventListener('contextmenu', (e) => e.preventDefault());
        document.getElementById('inventory-screen').addEventListener('click', (e) => {
            if (e.target.id === 'inventory-screen') {
                this.inventory.close();
            }
        });
    }

    async setupGame() {
        this.updateLoadingProgress(10);

        this.world = new World(this.scene);
        await this.world.generate();
        this.updateLoadingProgress(40);

        this.inventory = new Inventory(this);
        this.inventory.init();
        this.updateLoadingProgress(50);

        this.player = new Player(this.scene, this.camera, this.world, this.inventory);
        this.updateLoadingProgress(70);

        this.combat = new Combat(this.scene, this.world, this.player, this.inventory);
        this.combat.init();
        this.updateLoadingProgress(85);

        this.ui = new UI(this.player, this.combat);
        this.ui.init();
        this.updateLoadingProgress(100);
    }

    updateLoadingProgress(percent) {
        document.getElementById('loading-progress').style.width = percent + '%';
    }

    hideLoadingScreen() {
        document.getElementById('loading-screen').style.display = 'none';
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onKeyDown(e) {
        this.keys[e.code] = true;
        if (e.code === 'KeyI') {
            this.inventory.toggle();
        }
        if (e.code >= 'Digit1' && e.code <= 'Digit9') {
            const slot = parseInt(e.code.replace('Digit', '')) - 1;
            if (slot < this.inventory.hotbarSlots) {
                this.inventory.selectHotbarSlot(slot);
            }
        }
    }

    onKeyUp(e) {
        this.keys[e.code] = false;
    }

    onMouseMove(e) {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }

    onMouseDown(e) {
        if (e.button === 0) this.mouse.left = true;
        if (e.button === 2) this.mouse.right = true;
    }

    onMouseUp(e) {
        if (e.button === 0) this.mouse.left = false;
        if (e.button === 2) this.mouse.right = false;
    }

    updateRaycast() {
        this.raycaster.setFromCamera(new THREE.Vector2(this.mouse.x, this.mouse.y), this.camera);

        const breakableBlocks = this.world.blocks.filter(b => !b.isPartOfStructure);
        const intersects = this.raycaster.intersectObjects(breakableBlocks);

        if (intersects.length > 0 && intersects[0].distance < 8) {
            this.targetBlock = intersects[0].object;
            this.targetFace = intersects[0].face.normal;
        } else {
            this.targetBlock = null;
            this.targetFace = null;
        }
    }

    handleBlockInteraction(delta) {
        if (this.inventory.isOpen) return;

        this.updateRaycast();

        if (this.mouse.left && this.targetBlock && this.combat.attackCooldown <= 0) {
            const blockType = this.targetBlock.userData.type;
            this.world.removeBlock(this.targetBlock);
            this.inventory.addItem(blockType, 1);
            this.combat.attackCooldown = 0.5;
            this.ui.showNotification(`+1 ${blockType}`);
        }

        if (this.mouse.right && this.targetFace && this.targetBlock) {
            const selectedSlot = this.inventory.getSelectedSlot();
            if (selectedSlot && selectedSlot.count > 0) {
                const blockType = selectedSlot.type;
                const pos = this.targetBlock.position.clone().add(this.targetFace);
                if (!this.player.checkCollision(pos)) {
                    this.world.addBlock(pos.x, pos.y, pos.z, blockType);
                    this.inventory.removeItem(blockType, 1);
                }
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (!this.isRunning) return;

        const delta = this.clock.getDelta();

        if (this.player && this.player.health > 0) {
            this.player.update(delta, this.keys, this.mouse);
            this.handleBlockInteraction(delta);
            this.combat.update(delta);
            this.ui.update();
        }

        this.renderer.render(this.scene, this.camera);
    }
}

const game = new Game();
game.init();