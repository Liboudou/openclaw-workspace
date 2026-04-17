-- Schéma de base pour le projet TaskFlow Dashboard

CREATE TABLE utilisateurs (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    date_creation TIMESTAMP DEFAULT NOW()
);

CREATE TABLE taches (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    statut VARCHAR(50) NOT NULL DEFAULT 'en attente',
    priorite SMALLINT NOT NULL DEFAULT 1,
    deadline TIMESTAMP,
    utilisateur_id INT REFERENCES utilisateurs(id) ON DELETE SET NULL,
    date_creation TIMESTAMP DEFAULT NOW(),
    date_modification TIMESTAMP DEFAULT NOW()
);

CREATE TABLE logs_modifications (
    id SERIAL PRIMARY KEY,
    tache_id INT REFERENCES taches(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    utilisateur_id INT REFERENCES utilisateurs(id) ON DELETE SET NULL,
    date_action TIMESTAMP DEFAULT NOW(),
    details JSONB
);

-- Indexes pour optimiser les requêtes fréquentes
CREATE INDEX idx_taches_statut ON taches(statut);
CREATE INDEX idx_taches_priorite_deadline ON taches(priorite, deadline);
CREATE INDEX idx_logs_tache_id ON logs_modifications(tache_id);

-- Trigger pour historiser automatiquement les modifications
CREATE FUNCTION trigger_date_modification()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_modification = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_date_modification
BEFORE UPDATE ON taches
FOR EACH ROW
EXECUTE FUNCTION trigger_date_modification();