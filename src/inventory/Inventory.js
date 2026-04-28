import { BLOCK_TYPES } from '../world/World.js';

export class Inventory {
    constructor(game) {
        this.game = game;
        this.slots = [];
        this.hotbarSlots = 5;
        this.maxStackSize = 64;
        this.selectedSlotIndex = 0;
        this.isOpen = false;
        this.selectedItem = null;
    }

    init() {
        this.createSlots();
        this.createHotbar();
        this.addStartingItems();
    }

    createSlots() {
        for (let i = 0; i < 20; i++) {
            this.slots.push({ type: null, count: 0 });
        }
    }

    createHotbar() {
        const hotbar = document.getElementById('hotbar');
        hotbar.innerHTML = '';

        for (let i = 0; i < this.hotbarSlots; i++) {
            const slot = document.createElement('div');
            slot.className = 'hotbar-slot' + (i === 0 ? ' selected' : '');
            slot.innerHTML = `
                <span class="slot-number">${i + 1}</span>
                <div class="item-icon"></div>
                <span class="item-count"></span>
            `;
            slot.addEventListener('click', () => this.selectHotbarSlot(i));
            hotbar.appendChild(slot);
        }
    }

    createInventoryUI() {
        const grid = document.getElementById('inventory-grid');
        grid.innerHTML = '';

        for (let i = 0; i < 20; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            slot.innerHTML = `
                <div class="item-icon"></div>
                <span class="item-count"></span>
            `;
            slot.addEventListener('click', () => this.onSlotClick(i));
            grid.appendChild(slot);
        }
    }

    addStartingItems() {
        this.addItem(BLOCK_TYPES.DIRT, 20);
        this.addItem(BLOCK_TYPES.STONE, 15);
        this.addItem(BLOCK_TYPES.WOOD, 15);
        this.addItem(BLOCK_TYPES.SAND, 10);
        this.addItem('sword', 1);
        this.addItem('bow', 1);
        this.addItem('arrow', 10);
    }

    addItem(type, count) {
        let firstEmptySlot = -1;
        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i].type === type && this.slots[i].count < this.maxStackSize) {
                const canAdd = Math.min(count, this.maxStackSize - this.slots[i].count);
                this.slots[i].count += canAdd;
                count -= canAdd;
                if (count <= 0) {
                    this.updateUI();
                    return true;
                }
            }
            if (this.slots[i].type === null && firstEmptySlot === -1) {
                firstEmptySlot = i;
            }
        }

        while (count > 0 && firstEmptySlot !== -1) {
            const toAdd = Math.min(count, this.maxStackSize);
            this.slots[firstEmptySlot] = { type, count: toAdd };
            count -= toAdd;

            firstEmptySlot = -1;
            for (let i = 0; i < this.slots.length; i++) {
                if (this.slots[i].type === null) {
                    firstEmptySlot = i;
                    break;
                }
            }
        }

        this.updateUI();
        return count === 0;
    }

    removeItem(type, count) {
        for (let i = this.slots.length - 1; i >= 0; i--) {
            if (this.slots[i].type === type && this.slots[i].count > 0) {
                const toRemove = Math.min(count, this.slots[i].count);
                this.slots[i].count -= toRemove;
                count -= toRemove;
                if (this.slots[i].count <= 0) {
                    this.slots[i] = { type: null, count: 0 };
                }
                if (count <= 0) break;
            }
        }
        this.updateUI();
    }

    getSelectedSlot() {
        if (this.selectedSlotIndex < this.slots.length) {
            return this.slots[this.selectedSlotIndex];
        }
        return null;
    }

    selectHotbarSlot(index) {
        this.selectedSlotIndex = index;
        const hotbarSlots = document.querySelectorAll('.hotbar-slot');
        hotbarSlots.forEach((slot, i) => {
            slot.classList.toggle('selected', i === index);
        });

        if (index < this.hotbarSlots) {
            this.selectedItem = this.slots[index];
        }
    }

    onSlotClick(index) {
        if (this.selectedSlotIndex === index) return;

        const temp = this.slots[index];
        this.slots[index] = this.slots[this.selectedSlotIndex];
        this.slots[this.selectedSlotIndex] = temp;
        this.selectedItem = this.slots[this.selectedSlotIndex];
        this.updateUI();
    }

    toggle() {
        this.isOpen = !this.isOpen;
        const screen = document.getElementById('inventory-screen');
        screen.classList.toggle('active', this.isOpen);

        if (this.isOpen) {
            this.createInventoryUI();
            this.updateInventoryUI();
        }
    }

    close() {
        this.isOpen = false;
        document.getElementById('inventory-screen').classList.remove('active');
    }

    updateUI() {
        this.updateHotbar();
        if (this.isOpen) {
            this.updateInventoryUI();
        }
    }

    updateHotbar() {
        const hotbarSlots = document.querySelectorAll('.hotbar-slot');
        hotbarSlots.forEach((slot, i) => {
            if (i < this.hotbarSlots && this.slots[i]) {
                const itemIcon = slot.querySelector('.item-icon');
                const itemCount = slot.querySelector('.item-count');
                const slotData = this.slots[i];

                if (slotData.type) {
                    itemIcon.style.background = this.getItemColor(slotData.type);
                    itemIcon.style.display = 'block';
                    itemCount.textContent = slotData.count > 1 ? slotData.count : '';
                } else {
                    itemIcon.style.display = 'none';
                    itemCount.textContent = '';
                }
            }
        });
    }

    updateInventoryUI() {
        const invSlots = document.querySelectorAll('.inv-slot');
        invSlots.forEach((slot, i) => {
            if (i < this.slots.length) {
                const itemIcon = slot.querySelector('.item-icon');
                const itemCount = slot.querySelector('.item-count');
                const slotData = this.slots[i];

                if (slotData.type) {
                    itemIcon.style.background = this.getItemColor(slotData.type);
                    itemIcon.style.display = 'block';
                    itemCount.textContent = slotData.count > 1 ? slotData.count : '';
                } else {
                    itemIcon.style.display = 'none';
                    itemCount.textContent = '';
                }
            }
        });
    }

    getItemColor(type) {
        const colors = {
            [BLOCK_TYPES.GRASS]: '#4a7c4e',
            [BLOCK_TYPES.DIRT]: '#8b5a2b',
            [BLOCK_TYPES.STONE]: '#808080',
            [BLOCK_TYPES.WOOD]: '#8b4513',
            [BLOCK_TYPES.SAND]: '#c2b280',
            [BLOCK_TYPES.SNOW]: '#fffafa',
            [BLOCK_TYPES.LEAVES]: '#228b22',
            [BLOCK_TYPES.WATER]: '#4169e1',
            'sword': '#c0c0c0',
            'bow': '#8b4513',
            'arrow': '#deb887',
            'potion': '#e74c3c'
        };
        return colors[type] || '#888';
    }

    hasItem(type, count = 1) {
        let total = 0;
        for (const slot of this.slots) {
            if (slot.type === type) {
                total += slot.count;
                if (total >= count) return true;
            }
        }
        return total >= count;
    }

    getItemCount(type) {
        let total = 0;
        for (const slot of this.slots) {
            if (slot.type === type) {
                total += slot.count;
            }
        }
        return total;
    }
}