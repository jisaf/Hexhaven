"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const prisma = new client_1.PrismaClient();
async function loadJSON(filename) {
    let seedDataDir = path.join(__dirname, 'seed-data');
    if (__dirname.includes('dist/backend/prisma')) {
        seedDataDir = path.join(__dirname, '../../../prisma/seed-data');
    }
    const filePath = path.join(seedDataDir, filename);
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
}
async function seedCharacterClasses() {
    console.log('Seeding character classes...');
    const classes = await loadJSON('character-classes.json');
    for (const classData of classes) {
        await prisma.characterClass.upsert({
            where: { name: classData.name },
            update: {
                startingHealth: classData.startingHealth,
                maxHealthByLevel: classData.maxHealthByLevel,
                handSize: classData.handSize,
                perks: classData.perks,
                description: classData.description,
                imageUrl: classData.imageUrl,
            },
            create: {
                name: classData.name,
                startingHealth: classData.startingHealth,
                maxHealthByLevel: classData.maxHealthByLevel,
                handSize: classData.handSize,
                perks: classData.perks,
                description: classData.description,
                imageUrl: classData.imageUrl,
            },
        });
    }
    console.log(`✓ Seeded ${classes.length} character classes`);
}
async function seedAbilityCards() {
    console.log('Seeding ability cards...');
    const cards = await loadJSON('ability-cards.json');
    const classes = await prisma.characterClass.findMany();
    const classMap = new Map(classes.map((c) => [c.name, c.id]));
    let seedCount = 0;
    for (const cardData of cards) {
        const classId = classMap.get(cardData.className);
        if (!classId) {
            console.warn(`Warning: Class "${cardData.className}" not found, skipping card "${cardData.name}"`);
            continue;
        }
        const existingCard = await prisma.abilityCard.findFirst({
            where: {
                classId: classId,
                name: cardData.name,
            },
        });
        if (existingCard) {
            await prisma.abilityCard.update({
                where: { id: existingCard.id },
                data: {
                    level: cardData.level,
                    initiative: cardData.initiative,
                    topAction: cardData.topAction,
                    bottomAction: cardData.bottomAction,
                },
            });
        }
        else {
            await prisma.abilityCard.create({
                data: {
                    classId: classId,
                    name: cardData.name,
                    level: cardData.level,
                    initiative: cardData.initiative,
                    topAction: cardData.topAction,
                    bottomAction: cardData.bottomAction,
                },
            });
        }
        seedCount++;
    }
    console.log(`✓ Seeded ${seedCount} ability cards`);
}
async function seedItems() {
    console.log('Seeding items...');
    const items = await loadJSON('items.json');
    for (const itemData of items) {
        await prisma.item.upsert({
            where: { name: itemData.name },
            update: {
                type: itemData.type,
                rarity: itemData.rarity,
                effects: itemData.effects,
                cost: itemData.cost,
                description: itemData.description,
            },
            create: {
                name: itemData.name,
                type: itemData.type,
                rarity: itemData.rarity,
                effects: itemData.effects,
                cost: itemData.cost,
                description: itemData.description,
            },
        });
    }
    console.log(`✓ Seeded ${items.length} items`);
}
async function seedScenarios() {
    console.log('Seeding scenarios...');
    const scenarios = await loadJSON('scenarios.json');
    for (const scenarioData of scenarios) {
        await prisma.scenario.upsert({
            where: { name: scenarioData.name },
            update: {
                difficulty: scenarioData.difficulty,
                mapLayout: scenarioData.mapLayout,
                monsterGroups: scenarioData.monsterGroups,
                objectives: scenarioData.objectives,
                treasures: scenarioData.treasures,
                playerStartPositions: scenarioData.playerStartPositions,
            },
            create: {
                name: scenarioData.name,
                difficulty: scenarioData.difficulty,
                mapLayout: scenarioData.mapLayout,
                monsterGroups: scenarioData.monsterGroups,
                objectives: scenarioData.objectives,
                treasures: scenarioData.treasures,
                playerStartPositions: scenarioData.playerStartPositions,
            },
        });
    }
    console.log(`✓ Seeded ${scenarios.length} scenarios`);
}
async function seedCardLayoutTemplates() {
    console.log('Seeding card layout templates...');
    const templates = await loadJSON('card-layout-templates.json');
    for (const templateData of templates) {
        await prisma.cardLayoutTemplate.upsert({
            where: { name: templateData.name },
            update: {
                description: templateData.description,
                modules: templateData.modules,
            },
            create: {
                name: templateData.name,
                description: templateData.description,
                modules: templateData.modules,
            },
        });
    }
    console.log(`✓ Seeded ${templates.length} card layout templates`);
}
async function main() {
    console.log('Starting database seed...\n');
    try {
        await seedCardLayoutTemplates();
        await seedCharacterClasses();
        await seedAbilityCards();
        await seedItems();
        await seedScenarios();
        console.log('\n✅ Database seed completed successfully!');
    }
    catch (error) {
        console.error('\n❌ Error seeding database:', error);
        throw error;
    }
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map