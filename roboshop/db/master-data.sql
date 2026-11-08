-- Default admin user (password: RoboShop@1)
-- Note: This user will be created by the app on first login attempt if not exists
-- The INSERT IGNORE ensures idempotency on restarts

-- Products
INSERT IGNORE INTO products (sku, name, description, price, image_url, category, stock) VALUES
('ROB001', 'Robo-Arm Deluxe', 'Industrial robotic arm with 6-axis movement. Precision-engineered for manufacturing, assembly, and pick-and-place operations. Payload capacity: 10kg. Reach: 1.2m.', 1299.99, '/images/robo-arm.svg', 'Robots', 25),
('ROB002', 'AI Brain Module', 'Neural processing unit for autonomous decision-making. Features 128 TOPS AI inference, real-time sensor fusion, and adaptive learning algorithms.', 899.99, '/images/ai-brain.svg', 'AI Modules', 50),
('ROB003', 'Servo Motor Pack (x10)', 'High-torque digital servo motors with metal gears. Torque: 25kg/cm at 6V. Speed: 0.08s/60deg. Includes mounting hardware and cables.', 149.99, '/images/servo-motors.svg', 'Components', 200),
('ROB004', 'Vision Sensor Array', 'Multi-spectrum camera array for object recognition. Includes RGB, depth, and thermal sensors. 4K resolution, 60fps, with onboard AI preprocessing.', 449.99, '/images/vision-sensor.svg', 'Components', 75),
('ROB005', 'RoboOS Pro License', 'Advanced robotics operating system. Real-time task scheduling, ROS2 compatible, built-in SLAM navigation, fleet management, and OTA updates.', 599.99, '/images/roboos.svg', 'Software', 999),
('ROB006', 'Titanium Chassis Frame', 'Lightweight aerospace-grade titanium frame. CNC-machined with integrated cable routing. Supports robots up to 50kg. Dimensions: 60x40x30cm.', 349.99, '/images/chassis.svg', 'Components', 40),
('ROB007', 'LiPo Battery Pack 48V', 'High-capacity lithium polymer battery. 48V 20Ah (960Wh). Built-in BMS with cell balancing. Fast charging support. Runtime: 4-8 hours typical.', 199.99, '/images/battery.svg', 'Components', 150),
('ROB008', 'Wireless Control Module', 'Long-range RF controller with telemetry. 2.4GHz/900MHz dual-band, 2km range, 50ms latency. Includes joystick controller and receiver module.', 129.99, '/images/wireless-ctrl.svg', 'Accessories', 120),
('ROB009', 'AI Training Dataset', 'Curated dataset for robot vision training. 500K labeled images across 200 object categories. Includes augmentation scripts and baseline models.', 79.99, '/images/dataset.svg', 'Software', 999),
('ROB010', 'Gripper Attachment Kit', 'Universal gripper with force sensors. Adaptive 3-finger design, 0.5-150mm grip range, 50N max force. Includes pneumatic and electric versions.', 249.99, '/images/gripper.svg', 'Accessories', 85),
('ROB011', 'MicroBot Starter Kit', 'Complete beginner robot building kit. Includes Arduino-compatible controller, motors, sensors, chassis, and step-by-step tutorial. Ages 12+.', 199.99, '/images/microbot.svg', 'Robots', 300),
('ROB012', 'Neural Network Accelerator', 'GPU-based ML inference card. 256 TOPS INT8, 64GB HBM3 memory, PCIe 5.0 x16. Optimized for transformer models and real-time inference.', 1499.99, '/images/nn-accel.svg', 'AI Modules', 30);

-- Cities for shipping
INSERT IGNORE INTO cities (country_code, city, region, latitude, longitude) VALUES
('US', 'New York', 'New York', 40.7128000, -74.0060000),
('US', 'Los Angeles', 'California', 34.0522000, -118.2437000),
('US', 'Chicago', 'Illinois', 41.8781000, -87.6298000),
('US', 'Houston', 'Texas', 29.7604000, -95.3698000),
('US', 'Phoenix', 'Arizona', 33.4484000, -112.0740000),
('US', 'San Francisco', 'California', 37.7749000, -122.4194000),
('US', 'Seattle', 'Washington', 47.6062000, -122.3321000),
('US', 'Denver', 'Colorado', 39.7392000, -104.9903000),
('US', 'Miami', 'Florida', 25.7617000, -80.1918000),
('US', 'Atlanta', 'Georgia', 33.7490000, -84.3880000),
('GB', 'London', 'England', 51.5074000, -0.1278000),
('GB', 'Manchester', 'England', 53.4808000, -2.2426000),
('DE', 'Berlin', 'Berlin', 52.5200000, 13.4050000),
('DE', 'Munich', 'Bavaria', 48.1351000, 11.5820000),
('FR', 'Paris', 'Ile-de-France', 48.8566000, 2.3522000),
('JP', 'Tokyo', 'Kanto', 35.6762000, 139.6503000),
('JP', 'Osaka', 'Kansai', 34.6937000, 135.5023000),
('AU', 'Sydney', 'New South Wales', -33.8688000, 151.2093000),
('AU', 'Melbourne', 'Victoria', -37.8136000, 144.9631000),
('IN', 'Mumbai', 'Maharashtra', 19.0760000, 72.8777000),
('IN', 'Bangalore', 'Karnataka', 12.9716000, 77.5946000),
('IN', 'Hyderabad', 'Telangana', 17.3850000, 78.4867000),
('SG', 'Singapore', 'Singapore', 1.3521000, 103.8198000),
('AE', 'Dubai', 'Dubai', 25.2048000, 55.2708000),
('BR', 'Sao Paulo', 'Sao Paulo', -23.5505000, -46.6333000);
