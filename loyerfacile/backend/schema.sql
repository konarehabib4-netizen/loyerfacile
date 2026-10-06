USE loyerfacile;

CREATE TABLE owners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE properties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(255),
  FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE
);

CREATE TABLE units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  label VARCHAR(50) NOT NULL,
  monthly_rent INT NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE tenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit_id INT NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  entry_date DATE NOT NULL,
  exit_date DATE NULL,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
);

CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  amount INT NOT NULL,
  month_covered CHAR(7) NOT NULL,
  method ENUM('especes', 'wave', 'orange_money', 'mtn_money') NOT NULL,
  paid_at DATE NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);