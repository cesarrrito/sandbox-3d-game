import * as THREE from 'three';

export const BLOCK_TYPES = {
    GRASS: 'grass',
    DIRT: 'dirt',
    STONE: 'stone',
    WOOD: 'wood',
    SAND: 'sand',
    SNOW: 'snow',
    LEAVES: 'leaves',
    WATER: 'water'
};

export const BIOMES = {
    FOREST: { name: 'forest', ground: BLOCK_TYPES.GRASS, trees: true, color: 0x3d5c3d },
    DESERT: { name: 'desert', ground: BLOCK_TYPES.SAND, trees: false, color: 0xd4a574 },
    ICE: { name: 'ice', ground: BLOCK_TYPES.SNOW, trees: false, color: 0xe8f4f8 },
    VOLCANIC: { name: 'volcanic', ground: BLOCK_TYPES.STONE, trees: false, color: 0x4a4a4a }
};

export class World {
    constructor(scene) {
        this.scene = scene;
        this.blocks = [];
        this.chunkSize = 32;
        this.worldHeight = 16;
        this.blockSize = 1;
        this.structures = [];
    }

    async generate() {
        const noise = this.createNoise();
        const startX = -this.chunkSize / 2;
        const startZ = -this.chunkSize / 2;

        for (let x = startX; x < this.chunkSize / 2; x++) {
            for (let z = startZ; z < this.chunkSize / 2; z++) {
                this.generateChunkColumn(x, z, noise);
            }
        }

        this.generateStructures(noise);
        this.createSkybox();
    }

    createNoise() {
        const permutation = [];
        for (let i = 0; i < 256; i++) permutation[i] = i;
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
        }
        const p = [...permutation, ...permutation];

        return {
            permutation: p,
            fade: (t) => t * t * t * (t * (t * 6 - 15) + 10),
            lerp: (a, b, t) => a + t * (b - a),
            grad: (hash, x, y) => {
                const h = hash & 3;
                const u = h < 2 ? x : y;
                const v = h < 2 ? y : x;
                return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
            },
            noise2D: (x, y) => {
                const X = Math.floor(x) & 255;
                const Y = Math.floor(y) & 255;
                x -= Math.floor(x);
                y -= Math.floor(y);
                const u = this.noise.fade(x);
                const v = this.noise.fade(y);
                const A = p[X] + Y, B = p[X + 1] + Y;
                return this.noise.lerp(
                    this.noise.lerp(this.noise.grad(p[A], x, y), this.noise.grad(p[B], x - 1, y), u),
                    this.noise.lerp(this.noise.grad(p[A + 1], x, y - 1), this.noise.grad(p[B + 1], x - 1, y - 1), u),
                    v
                );
            }
        };
    }

    getBiome(x, z) {
        const biomeNoise = this.noise.noise2D(x * 0.02, z * 0.02);
        const tempNoise = this.noise.noise2D(x * 0.01 + 100, z * 0.01 + 100);

        if (tempNoise > 0.5) {
            return BIOMES.VOLCANIC;
        } else if (tempNoise > 0.2) {
            return BIOMES.ICE;
        } else if (tempNoise < -0.3) {
            return BIOMES.DESERT;
        } else {
            return BIOMES.FOREST;
        }
    }

    generateChunkColumn(x, z, noise) {
        const biome = this.getBiome(x, z);
        const heightNoise = noise.noise2D(x * 0.05, z * 0.05);
        const height = Math.floor(5 + (heightNoise + 1) * 4);

        for (let y = 0; y < height; y++) {
            let blockType;
            if (y === height - 1) {
                blockType = biome.ground;
            } else if (y > height - 4) {
                blockType = BLOCK_TYPES.DIRT;
            } else {
                blockType = BLOCK_TYPES.STONE;
            }
            this.addBlock(x, y, z, blockType, false);
        }

        if (biome.trees && Math.random() < 0.02) {
            this.generateTree(x, height, z);
        }
    }

    generateTree(x, baseY, z) {
        const trunkHeight = 4 + Math.floor(Math.random() * 3);
        for (let i = 0; i < trunkHeight; i++) {
            this.addBlock(x, baseY + i, z, BLOCK_TYPES.WOOD, false);
        }
        const leafRadius = 2;
        for (let dx = -leafRadius; dx <= leafRadius; dx++) {
            for (let dy = 0; dy <= leafRadius; dy++) {
                for (let dz = -leafRadius; dz <= leafRadius; dz++) {
                    if (Math.abs(dx) + Math.abs(dz) + dy <= leafRadius + 1) {
                        if (dx === 0 && dz === 0 && dy < 2) continue;
                        const leafY = baseY + trunkHeight + dy - 1;
                        this.addBlock(x + dx, leafY, z + dz, BLOCK_TYPES.LEAVES, false);
                    }
                }
            }
        }
    }

    generateStructures(noise) {
        for (let i = 0; i < 3; i++) {
            const x = Math.floor((Math.random() - 0.5) * this.chunkSize * 0.8);
            const z = Math.floor((Math.random() - 0.5) * this.chunkSize * 0.8);
            this.generateStructure(x, z, 'house');
        }
    }

    generateStructure(x, z, type) {
        if (type === 'house') {
            const height = 4;
            for (let dx = -2; dx <= 2; dx++) {
                for (let dz = -2; dz <= 2; dz++) {
                    this.addBlock(x + dx, 0, z + dz, BLOCK_TYPES.STONE, true);
                    this.addBlock(x + dx, 1, z + dz, dx === 0 && dz === -2 ? BLOCK_TYPES.AIR : BLOCK_TYPES.DIRT, true);
                }
            }
            for (let y = 1; y <= height; y++) {
                for (let dy = 0; dy <= 1; dy++) {
                    this.addBlock(x - 2, y + dy, z - 2, BLOCK_TYPES.WOOD, true);
                    this.addBlock(x + 2, y + dy, z - 2, BLOCK_TYPES.WOOD, true);
                    this.addBlock(x - 2, y + dy, z + 2, BLOCK_TYPES.WOOD, true);
                    this.addBlock(x + 2, y + dy, z + 2, BLOCK_TYPES.WOOD, true);
                }
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0) continue;
                    this.addBlock(x + dx, y, z - 2, BLOCK_TYPES.WOOD, true);
                    this.addBlock(x + dx, y, z + 2, BLOCK_TYPES.WOOD, true);
                }
            }
            this.addBlock(x, height + 1, z - 2, BLOCK_TYPES.WOOD, true);
            this.addBlock(x, height + 1, z + 2, BLOCK_TYPES.WOOD, true);
            this.addBlock(x - 2, height + 1, z, BLOCK_TYPES.WOOD, true);
            this.addBlock(x + 2, height + 1, z, BLOCK_TYPES.WOOD, true);
        }
    }

    addBlock(x, y, z, type, isPartOfStructure = false) {
        const geometry = new THREE.BoxGeometry(this.blockSize, this.blockSize, this.blockSize);
        const material = this.getBlockMaterial(type);
        const block = new THREE.Mesh(geometry, material);
        block.position.set(x, y, z);
        block.castShadow = true;
        block.receiveShadow = true;
        block.userData = { type, isPartOfStructure };
        this.scene.add(block);
        this.blocks.push(block);
    }

    getBlockMaterial(type) {
        const materials = {
            [BLOCK_TYPES.GRASS]: new THREE.MeshLambertMaterial({ color: 0x4a7c4e }),
            [BLOCK_TYPES.DIRT]: new THREE.MeshLambertMaterial({ color: 0x8b5a2b }),
            [BLOCK_TYPES.STONE]: new THREE.MeshLambertMaterial({ color: 0x808080 }),
            [BLOCK_TYPES.WOOD]: new THREE.MeshLambertMaterial({ color: 0x8b4513 }),
            [BLOCK_TYPES.SAND]: new THREE.MeshLambertMaterial({ color: 0xc2b280 }),
            [BLOCK_TYPES.SNOW]: new THREE.MeshLambertMaterial({ color: 0xfffafa }),
            [BLOCK_TYPES.LEAVES]: new THREE.MeshLambertMaterial({ color: 0x228b22, transparent: true, opacity: 0.9 }),
            [BLOCK_TYPES.WATER]: new THREE.MeshLambertMaterial({ color: 0x4169e1, transparent: true, opacity: 0.6 })
        };
        return materials[type] || new THREE.MeshLambertMaterial({ color: 0xff00ff });
    }

    removeBlock(block) {
        const index = this.blocks.indexOf(block);
        if (index > -1) {
            this.blocks.splice(index, 1);
            this.scene.remove(block);
            block.geometry.dispose();
            if (Array.isArray(block.material)) {
                block.material.forEach(m => m.dispose());
            } else {
                block.material.dispose();
            }
        }
    }

    createSkybox() {
        const skyGeo = new THREE.BoxGeometry(500, 500, 500);
        const skyMat = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
    }

    getBlockAt(x, y, z) {
        return this.blocks.find(b =>
            b.position.x === x && b.position.y === y && b.position.z === z
        );
    }

    getBlocksNear(x, y, z, radius) {
        return this.blocks.filter(b => {
            const dx = b.position.x - x;
            const dy = b.position.y - y;
            const dz = b.position.z - z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz) < radius;
        });
    }
}