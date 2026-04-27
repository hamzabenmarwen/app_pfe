-- ============================================================
-- SEED DATA - Assiette Gala Sfaxienne
-- Données de test pour comprendre les fonctionnalités Admin & Client
-- ============================================================

-- ============================================================
-- 1. AUTH SERVICE - Utilisateurs
-- ============================================================

-- Admin principal (M. Omar Daoud)
INSERT INTO users (id, email, password, first_name, last_name, phone, role, is_verified, created_at) VALUES
('admin-001', 'omar.daoud@assiettegala.tn', '$2b$10$YourHashedPasswordHere', 'Omar', 'Daoud', '24230587', 'ADMIN', true, NOW());

-- Clients de test
INSERT INTO users (id, email, password, first_name, last_name, phone, role, is_verified, created_at) VALUES
('client-001', 'client1@email.tn', '$2b$10$YourHashedPasswordHere', 'Ahmed', 'Ben Ali', '20123456', 'CLIENT', true, '2025-01-15 10:30:00'),
('client-002', 'client2@email.tn', '$2b$10$YourHashedPasswordHere', 'Fatima', 'Trabelsi', '22123456', 'CLIENT', true, '2025-02-20 14:20:00'),
('client-003', 'client3@email.tn', '$2b$10$YourHashedPasswordHere', 'Mohamed', 'Sassi', '23123456', 'CLIENT', true, '2025-03-10 09:15:00'),
('client-004', 'societe@sfaxtech.tn', '$2b$10$YourHashedPasswordHere', 'Société', 'Sfax Tech', '71123456', 'CLIENT', true, '2025-04-05 11:00:00');

-- Adresses des clients
INSERT INTO addresses (id, label, street, city, postal_code, is_default, user_id) VALUES
('addr-001', 'Domicile', '15 Rue de Marseille', 'Sfax', '3000', true, 'client-001'),
('addr-002', 'Bureau', 'Zone Industrielle Route de Mahdia', 'Sfax', '3010', false, 'client-001'),
('addr-003', 'Domicile', '25 Avenue Hedi Chaker', 'Sfax', '3000', true, 'client-002'),
('addr-004', 'Domicile', '10 Rue Ibn Khaldoun', 'Sfax', '3025', true, 'client-003'),
('addr-005', 'Siège Social', 'Immeuble Les Jasmins, Route de lAéroport', 'Sfax', '3060', true, 'client-004');

-- ============================================================
-- 2. CATALOG SERVICE - Menu & Plats
-- ============================================================

-- Catégories
INSERT INTO categories (id, name, description, created_at) VALUES
('cat-001', 'Entrées', 'Salades et hors-dœuvre variés', NOW()),
('cat-002', 'Plats Principaux', 'Spécialités de la maison', NOW()),
('cat-003', 'Grillades', 'Viandes et poissons grillés', NOW()),
('cat-004', 'Couscous', 'Couscous traditionnels tunisiens', NOW()),
('cat-005', 'Desserts', 'Pâtisseries orientales et desserts', NOW()),
('cat-006', 'Boissons', 'Jus frais et boissons', NOW());

-- Allergènes
INSERT INTO allergens (id, name, created_at) VALUES
('all-001', 'Gluten', NOW()),
('all-002', 'Crustacés', NOW()),
('all-003', 'Œufs', NOW()),
('all-004', 'Poisson', NOW()),
('all-005', 'Arachides', NOW()),
('all-006', 'Soja', NOW()),
('all-007', 'Lait', NOW()),
('all-008', 'Fruits à coque', NOW()),
('all-009', 'Céleri', NOW()),
('all-010', 'Moutarde', NOW()),
('all-011', 'Graines de sésame', NOW()),
('all-012', 'Sulfites', NOW());

-- Plats avec URLs Cloudinary simulées
INSERT INTO plats (id, name, description, price, image, is_available, category_id, created_at) VALUES
-- Entrées
('plat-001', 'Salade Mechouia', 'Poivrons et tomates grillés, assaisonnés à lhuile dolive', 8.50, 'https://res.cloudinary.com/demo/assiette/mechouia.jpg', true, 'cat-001', NOW()),
('plat-002', 'Brik à lœuf', 'Feuille de brick croustillante garnie dœuf et de thon', 5.00, 'https://res.cloudinary.com/demo/assiette/brik.jpg', true, 'cat-001', NOW()),
('plat-003', 'Salade Niçoise', 'Thon, œufs, haricots verts, olives et pommes de terre', 12.00, 'https://res.cloudinary.com/demo/assiette/nicoise.jpg', true, 'cat-001', NOW()),

-- Plats Principaux
('plat-004', 'Gratin de crevettes', 'Crevettes gratinées au fromage et béchamel', 25.00, 'https://res.cloudinary.com/demo/assiette/gratin-crevettes.jpg', true, 'cat-002', NOW()),
('plat-005', 'Filet de daurade', 'Filet de daurade grillé, sauce citron et herbes', 22.00, 'https://res.cloudinary.com/demo/assiette/daurade.jpg', true, 'cat-002', NOW()),
('plat-006', 'Ojja crevettes', 'Sauce tomate épicée aux crevettes et aux œufs', 18.00, 'https://res.cloudinary.com/demo/assiette/ojja.jpg', true, 'cat-002', NOW()),
('plat-007', 'Cordon bleu de poulet', 'Escalope de poulet panée, farcie au fromage et jambon', 16.00, 'https://res.cloudinary.com/demo/assiette/cordon.jpg', true, 'cat-002', NOW()),

-- Grillades
('plat-008', 'Mixed Grill (4 viandes)', 'Agneau, bœuf, poulet et merguez, marinade maison', 35.00, 'https://res.cloudinary.com/demo/assiette/mixed-grill.jpg', true, 'cat-003', NOW()),
('plat-009', 'Brochette de crevettes x6', 'Crevettes marinées, grillées à la perfection', 28.00, 'https://res.cloudinary.com/demo/assiette/brochettes-crevettes.jpg', true, 'cat-003', NOW()),
('plat-010', 'Entrecôte 300g', 'Entrecôte de bœuf, sauce au poivre vert', 42.00, 'https://res.cloudinary.com/demo/assiette/entrecote.jpg', true, 'cat-003', NOW()),

-- Couscous
('plat-011', 'Couscous Royal', 'Agneau, poulet, merguez, légumes variés', 28.00, 'https://res.cloudinary.com/demo/assiette/royal.jpg', true, 'cat-004', NOW()),
('plat-012', 'Couscous aux crevettes', 'Crevettes, calamars et poisson, légumes', 32.00, 'https://res.cloudinary.com/demo/assiette/couscous-mer.jpg', true, 'cat-004', NOW()),
('plat-013', 'Couscous végétarien', 'Légumes de saison, pois chiches, raisins secs', 18.00, 'https://res.cloudinary.com/demo/assiette/couscous-veg.jpg', true, 'cat-004', NOW()),

-- Desserts
('plat-014', 'Assiette de pâtisseries orientales', 'Baklava, kaak, ghribia (6 pièces)', 15.00, 'https://res.cloudinary.com/demo/assiette/orientales.jpg', true, 'cat-005', NOW()),
('plat-015', 'Crème caramel maison', 'Flan caramel traditionnel', 6.00, 'https://res.cloudinary.com/demo/assiette/flan.jpg', true, 'cat-005', NOW()),
('plat-016', 'Salade de fruits frais', 'Fruits de saison coupés', 10.00, 'https://res.cloudinary.com/demo/assiette/fruits.jpg', true, 'cat-005', NOW()),

-- Boissons
('plat-017', 'Jus dorange frais', 'Pressé à la commande', 5.00, 'https://res.cloudinary.com/demo/assiette/orange.jpg', true, 'cat-006', NOW()),
('plat-018', 'Citronnade à la menthe', 'Citron, menthe fraîche, sucre', 4.50, 'https://res.cloudinary.com/demo/assiette/citronnade.jpg', true, 'cat-006', NOW()),
('plat-019', 'Eau minérale 1L', 'Eau de source', 2.50, 'https://res.cloudinary.com/demo/assiette/eau.jpg', true, 'cat-006', NOW());

-- Relations plats-allergènes
INSERT INTO _plat_allergens (a, b) VALUES
('plat-002', 'all-003'), -- Brik à lœuf → Œufs
('plat-002', 'all-004'), -- Brik à lœuf → Poisson (thon)
('plat-003', 'all-003'), -- Salade Niçoise → Œufs
('plat-004', 'all-002'), -- Gratin crevettes → Crustacés
('plat-004', 'all-007'), -- Gratin crevettes → Lait
('plat-005', 'all-004'), -- Daurade → Poisson
('plat-006', 'all-002'), -- Ojja crevettes → Crustacés
('plat-006', 'all-003'), -- Ojja crevettes → Œufs
('plat-007', 'all-003'), -- Cordon bleu → Œufs
('plat-007', 'all-007'), -- Cordon bleu → Lait
('plat-008', 'all-011'), -- Mixed Grill → Sésame
('plat-009', 'all-002'), -- Brochette crevettes → Crustacés
('plat-012', 'all-002'), -- Couscous mer → Crustacés
('plat-012', 'all-004'), -- Couscous mer → Poisson
('plat-013', 'all-001'), -- Couscous veg → Gluten
('plat-014', 'all-001'), -- Pâtisseries → Gluten
('plat-014', 'all-005'), -- Pâtisseries → Arachides
('plat-014', 'all-007'), -- Pâtisseries → Lait
('plat-014', 'all-011'), -- Pâtisseries → Sésame
('plat-015', 'all-007'); -- Flan → Lait

-- ============================================================
-- 3. ORDER SERVICE - Commandes et Factures
-- ============================================================

-- Commandes avec différents statuts
INSERT INTO orders (id, order_number, user_id, status, total_amount, delivery_fee, vat_amount, delivery_address, payment_method, notes, created_at, updated_at) VALUES
-- Commandes livrées (pour les statistiques)
('ord-001', 'ORD-250115-A1B2', 'client-001', 'DELIVERED', 52.50, 7.00, 8.50, '15 Rue de Marseille, Sfax', 'CASH_ON_DELIVERY', 'Sonner à linterphone', '2025-01-15 12:30:00', '2025-01-15 14:00:00'),
('ord-002', 'ORD-250120-C3D4', 'client-002', 'DELIVERED', 85.00, 7.00, 13.77, '25 Avenue Hedi Chaker, Sfax', 'CASH_ON_DELIVERY', NULL, '2025-01-20 11:45:00', '2025-01-20 13:30:00'),
('ord-003', 'ORD-250128-E5F6', 'client-001', 'DELIVERED', 33.00, 7.00, 5.35, '15 Rue de Marseille, Sfax', 'CASH_ON_DELIVERY', 'Portail bleu', '2025-01-28 19:00:00', '2025-01-28 20:15:00'),
('ord-004', 'ORD-250205-G7H8', 'client-003', 'DELIVERED', 127.00, 0.00, 20.55, '10 Rue Ibn Khaldoun, Sfax', 'CASH_ON_DELIVERY', 'Commande entreprise', '2025-02-05 11:00:00', '2025-02-05 13:00:00'),
('ord-005', 'ORD-250212-I9J0', 'client-004', 'DELIVERED', 245.00, 7.00, 39.68, 'Immeuble Les Jasmins, Sfax', 'CASH_ON_DELIVERY', 'Livraison bureau', '2025-02-12 12:15:00', '2025-02-12 14:30:00'),

-- Commandes en cours (pour démonstration dashboard)
('ord-006', 'ORD-260420-K1L2', 'client-001', 'PENDING', 48.50, 7.00, 7.85, '15 Rue de Marseille, Sfax', 'CASH_ON_DELIVERY', 'Livrer avant 13h', '2026-04-20 09:00:00', '2026-04-20 09:00:00'),
('ord-007', 'ORD-260420-M3N4', 'client-002', 'CONFIRMED', 72.00, 7.00, 11.65, '25 Avenue Hedi Chaker, Sfax', 'CASH_ON_DELIVERY', NULL, '2026-04-20 10:30:00', '2026-04-20 10:35:00'),
('ord-008', 'ORD-260420-O5P6', 'client-003', 'PREPARING', 94.00, 7.00, 15.21, '10 Rue Ibn Khaldoun, Sfax', 'CASH_ON_DELIVERY', 'Allergique aux cacahuètes', '2026-04-20 11:00:00', '2026-04-20 11:30:00'),

-- Commandes annulées (pour statistiques)
('ord-009', 'ORD-250130-Q7R8', 'client-002', 'CANCELLED', 45.00, 7.00, 7.28, '25 Avenue Hedi Chaker, Sfax', 'CASH_ON_DELIVERY', 'Client a annulé', '2025-01-30 18:00:00', '2025-01-30 18:15:00'),
('ord-010', 'ORD-250218-S9T0', 'client-003', 'CANCELLED', 62.00, 7.00, 10.03, '10 Rue Ibn Khaldoun, Sfax', 'CASH_ON_DELIVERY', 'Indisponible', '2025-02-18 19:30:00', '2025-02-18 19:45:00');

-- Items des commandes
INSERT INTO order_items (id, order_id, plat_id, plat_name, unit_price, quantity) VALUES
-- Commande 001 (DELIVERED - client-001)
('oi-001', 'ord-001', 'plat-004', 'Gratin de crevettes', 25.00, 1),
('oi-002', 'ord-001', 'plat-014', 'Assiette de pâtisseries orientales', 15.00, 1),
('oi-003', 'ord-001', 'plat-017', 'Jus dorange frais', 5.00, 1),

-- Commande 002 (DELIVERED - client-002)
('oi-004', 'ord-002', 'plat-008', 'Mixed Grill (4 viandes)', 35.00, 1),
('oi-005', 'ord-002', 'plat-004', 'Gratin de crevettes', 25.00, 1),
('oi-006', 'ord-002', 'plat-015', 'Crème caramel maison', 6.00, 2),
('oi-007', 'ord-002', 'plat-018', 'Citronnade à la menthe', 4.50, 2),

-- Commande 003 (DELIVERED - client-001 - panier moyen)
('oi-008', 'ord-003', 'plat-006', 'Ojja crevettes', 18.00, 1),
('oi-009', 'ord-003', 'plat-003', 'Salade Niçoise', 12.00, 1),

-- Commande 004 (DELIVERED - client-003 - grosse commande entreprise)
('oi-010', 'ord-004', 'plat-011', 'Couscous Royal', 28.00, 3),
('oi-011', 'ord-004', 'plat-001', 'Salade Mechouia', 8.50, 4),
('oi-012', 'ord-004', 'plat-014', 'Assiette de pâtisseries orientales', 15.00, 2),

-- Commande 005 (DELIVERED - client-004 - commande société)
('oi-013', 'ord-005', 'plat-012', 'Couscous aux crevettes', 32.00, 5),
('oi-014', 'ord-005', 'plat-001', 'Salade Mechouia', 8.50, 8),
('oi-015', 'ord-005', 'plat-019', 'Eau minérale 1L', 2.50, 10),

-- Commande 006 (PENDING)
('oi-016', 'ord-006', 'plat-005', 'Filet de daurade', 22.00, 1),
('oi-017', 'ord-006', 'plat-002', 'Brik à lœuf', 5.00, 2),
('oi-018', 'ord-006', 'plat-016', 'Salade de fruits frais', 10.00, 1),

-- Commande 007 (CONFIRMED)
('oi-019', 'ord-007', 'plat-010', 'Entrecôte 300g', 42.00, 1),
('oi-020', 'ord-007', 'plat-003', 'Salade Niçoise', 12.00, 1),
('oi-021', 'ord-007', 'plat-015', 'Crème caramel maison', 6.00, 1),

-- Commande 008 (PREPARING)
('oi-022', 'ord-008', 'plat-009', 'Brochette de crevettes x6', 28.00, 2),
('oi-023', 'ord-008', 'plat-001', 'Salade Mechouia', 8.50, 2),
('oi-024', 'ord-008', 'plat-013', 'Couscous végétarien', 18.00, 1);

-- Factures associées
INSERT INTO invoices (id, invoice_number, order_id, total_amount, vat_amount, created_at) VALUES
('inv-001', 'INV-202501-A1B2', 'ord-001', 52.50, 8.50, '2025-01-15'),
('inv-002', 'INV-202501-C3D4', 'ord-002', 85.00, 13.77, '2025-01-20'),
('inv-003', 'INV-202501-E5F6', 'ord-003', 33.00, 5.35, '2025-01-28'),
('inv-004', 'INV-202502-G7H8', 'ord-004', 127.00, 20.55, '2025-02-05'),
('inv-005', 'INV-202502-I9J0', 'ord-005', 245.00, 39.68, '2025-02-12');

-- ============================================================
-- 4. EVENT SERVICE - Événements et Devis
-- ============================================================

INSERT INTO events (id, event_type, guest_count, event_date, budget_estimate, status, client_id, description, created_at) VALUES
-- Devis acceptés (confirmera la conversion rate)
('evt-001', 'WEDDING', 120, '2025-06-15', 8500.00, 'CONFIRMED', 'client-001', 'Mariage traditionnel tunisien', '2025-01-20 10:00:00'),
('evt-002', 'CORPORATE', 80, '2025-05-20', 3200.00, 'CONFIRMED', 'client-004', 'Déjeuner entreprise fin année fiscale', '2025-02-15 09:30:00'),
('evt-003', 'BIRTHDAY', 40, '2025-04-25', 1200.00, 'CONFIRMED', 'client-002', 'Anniversaire 40 ans', '2025-03-10 14:00:00'),

-- Devis en attente
('evt-004', 'WEDDING', 200, '2025-09-10', 12000.00, 'QUOTE_PENDING', 'client-003', 'Grand mariage avec 3 services', '2025-03-20 11:00:00'),
('evt-005', 'CORPORATE', 150, '2025-07-01', 5500.00, 'QUOTE_PENDING', 'client-004', 'Conférence entreprise', '2025-04-10 10:00:00'),

-- Devis refusés (pour stats)
('evt-006', 'BIRTHDAY', 25, '2025-03-30', 750.00, 'QUOTE_REJECTED', 'client-002', 'Trop cher selon client', '2025-02-28 16:00:00');

-- ============================================================
-- 5. STOCK - Gestion des matières premières
-- ============================================================

INSERT INTO stock_items (id, name, category, unit, quantity_in_stock, min_threshold, unit_cost, supplier_id, created_at) VALUES
('stock-001', 'Tomates', 'Légumes', 'kg', 25.5, 10.0, 2.50, 'supp-001', NOW()),
('stock-002', 'Pommes de terre', 'Légumes', 'kg', 40.0, 15.0, 1.80, 'supp-001', NOW()),
('stock-003', 'Carottes', 'Légumes', 'kg', 18.0, 8.0, 2.20, 'supp-001', NOW()),
('stock-004', 'Filet de poulet', 'Viandes', 'kg', 12.5, 5.0, 18.50, 'supp-002', NOW()),
('stock-005', 'Crevettes fraîches', 'Poissons', 'kg', 8.0, 3.0, 45.00, 'supp-003', NOW()),
('stock-006', 'Daurade entière', 'Poissons', 'kg', 15.0, 5.0, 22.00, 'supp-003', NOW()),
('stock-007', 'Semoule fine', 'Céréales', 'kg', 30.0, 10.0, 3.50, 'supp-004', NOW()),
('stock-008', 'Huile dolive', 'Huiles', 'L', 50.0, 20.0, 8.00, 'supp-005', NOW()),
('stock-009', 'Œufs frais', 'Produits laitiers', 'douzaine', 20.0, 8.0, 4.50, 'supp-006', NOW()),
('stock-010', 'Fromage râpé', 'Produits laitiers', 'kg', 5.0, 2.0, 12.00, 'supp-006', NOW()),
('stock-011', 'Merguez', 'Charcuterie', 'kg', 8.5, 3.0, 15.00, 'supp-002', NOW()),
('stock-012', 'Baklava (prêt)', 'Pâtisseries', 'kg', 3.0, 1.0, 25.00, 'supp-007', NOW()),
('stock-013', 'Menthe fraîche', 'Herbes', 'botte', 12.0, 5.0, 1.50, 'supp-001', NOW()),
('stock-014', 'Oranges', 'Fruits', 'kg', 20.0, 8.0, 2.80, 'supp-001', NOW()),
('stock-015', 'Citrons', 'Fruits', 'kg', 10.0, 4.0, 3.20, 'supp-001', NOW()),
('stock-016', 'Sel', 'Épices', 'kg', 5.0, 1.0, 1.00, 'supp-004', NOW()),
('stock-017', 'Harissa', 'Condiments', 'pot', 15.0, 5.0, 4.50, 'supp-004', NOW()),
('stock-018', 'Bricks (feuilles)', 'Produits secs', 'paquet', 8.0, 3.0, 5.00, 'supp-004', NOW()),
('stock-019', 'Agneau épaule', 'Viandes', 'kg', 10.0, 4.0, 28.00, 'supp-002', NOW()),
('stock-020', 'Bœuf entrecôte', 'Viandes', 'kg', 6.0, 2.0, 42.00, 'supp-002', NOW());

-- Fournisseurs
INSERT INTO suppliers (id, name, contact_person, phone, email, address, categories, created_at) VALUES
('supp-001', 'Primeur du Centre', 'Ahmed Ben Salah', '74234567', 'contact@primeurcentre.tn', 'Marché central, Sfax', 'Légumes,Fruits,Herbes', NOW()),
('supp-002', 'Boucherie Moderne', 'Ridha Gafsi', '73234567', 'commandes@boucherie.tn', 'Route de Gabès km 3, Sfax', 'Viandes,Charcuterie', NOW()),
('supp-003', 'Poissonnerie Kerkennah', 'Khaled Mrabet', '72234567', 'kerkennah@poisson.tn', 'Port de pêche, Sfax', 'Poissons', NOW()),
('supp-004', 'Épicerie Fine Sfax', 'Samia Jaziri', '71234567', 'epicerie@sfax.tn', 'Avenue Habib Bourguiba, Sfax', 'Céréales,Huiles,Épices,Produits secs', NOW()),
('supp-005', 'Huilerie Tounes', 'Mohamed Ben Ali', '70234567', 'ventes@tounes.tn', 'Route El Amra, Sfax', 'Huiles', NOW()),
('supp-006', 'Cooperative Laitière', 'Fatma Driss', '69234567', 'lait@coop.tn', 'Zone agricole, Sfax', 'Produits laitiers', NOW()),
('supp-007', 'Pâtisserie Andalucia', 'Yassine Masmoudi', '68234567', 'commande@andalucia.tn', 'Centre ville, Sfax', 'Pâtisseries', NOW());

-- Mouvements de stock (exemples)
INSERT INTO stock_movements (id, stock_item_id, type, quantity, reason, created_by, created_at) VALUES
('sm-001', 'stock-005', 'IN', 5.0, 'Réception commande fournisseur Kerkennah', 'admin-001', '2026-04-19 08:00:00'),
('sm-002', 'stock-001', 'OUT', 3.5, 'Préparation Couscous Royal x3', 'admin-001', '2026-04-19 11:30:00'),
('sm-003', 'stock-007', 'OUT', 1.5, 'Préparation Couscous Royal x3', 'admin-001', '2026-04-19 11:30:00'),
('sm-004', 'stock-019', 'OUT', 2.0, 'Préparation Mixed Grill x2', 'admin-001', '2026-04-20 09:00:00'),
('sm-005', 'stock-011', 'OUT', 0.5, 'Préparation Couscous Royal x1', 'admin-001', '2026-04-20 09:30:00');

-- ============================================================
-- 6. CHAT HISTORY - Historique conversations IA
-- ============================================================

INSERT INTO chat_messages (id, user_id, role, content, intent, created_at) VALUES
-- Client 001 - Questions sur allergènes
('chat-001', 'client-001', 'user', 'Bonjour, avez-vous des plats sans gluten ?', 'allergen', '2025-01-10 10:00:00'),
('chat-002', 'client-001', 'assistant', 'Bonjour ! Oui, nous proposons plusieurs options sans gluten : le Couscous végétarien (18 TND), les Grillades de viandes (poulet, bœuf), et nos salades fraîches. Nous pouvons aussi adapter certains plats sur demande.', 'allergen', '2025-01-10 10:00:05'),
('chat-003', 'client-001', 'user', 'Parfait, je vais commander le couscous végétarien', 'menu', '2025-01-10 10:01:00'),
('chat-004', 'client-001', 'assistant', 'Excellent choix ! Le Couscous végétarien (18 TND) est préparé avec des légumes de saison frais. Souhaitez-vous le faire livrer ou à emporter ?', 'menu', '2025-01-10 10:01:03'),

-- Client 002 - Questions sur événements
('chat-005', 'client-002', 'user', 'Bonjour, je souhaite organiser un buffet pour mon anniversaire (40 personnes). Quelles sont vos formules ?', 'event', '2025-03-05 14:00:00'),
('chat-006', 'client-002', 'assistant', 'Bonjour et joyeux anniversaire en avance ! Pour 40 personnes, nous proposons plusieurs formules : buffet froid (30 TND/personne), buffet chaud (45 TND/personne), ou mixte (55 TND/personne). Souhaitez-vous un devis personnalisé avec visite des lieux ?', 'event', '2025-03-05 14:00:08'),
('chat-007', 'client-002', 'user', 'Oui, je préfère le buffet mixte', 'event', '2025-03-05 14:01:00'),
('chat-008', 'client-002', 'assistant', 'Parfait ! Je vais transmettre votre demande à notre équipe événementielle. Quelle est la date prévue ? Ils vous contacteront sous 24h pour fixer une visite.', 'event', '2025-03-05 14:01:05'),

-- Client 003 - Questions menu général
('chat-009', 'client-003', 'user', 'Quel est votre plat le plus populaire ?', 'menu', '2025-02-15 19:30:00'),
('chat-010', 'client-003', 'assistant', 'Notre plat signature est le Couscous Royal (28 TND) avec agneau, poulet, merguez et légumes. Cest un best-seller ! Le Mixed Grill est également très apprécié (35 TND).', 'menu', '2025-02-15 19:30:05');

-- ============================================================
-- FIN DES DONNÉES DE TEST
-- ============================================================

-- Commandes de vérification
-- SELECT * FROM users;
-- SELECT * FROM orders WHERE status = 'DELIVERED';
-- SELECT * FROM stock_items WHERE quantity_in_stock < min_threshold;
