import os
import yaml
import glob

MASTER_DATASET_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../AI_Model_Training/Master_Dataset'))
MASTER_DATA_YAML_PATH = os.path.join(MASTER_DATASET_DIR, 'data.yaml')

def remove_class_from_ai_dataset(class_name):
    if not os.path.exists(MASTER_DATA_YAML_PATH):
        print("AI dataset data.yaml not found.")
        return

    with open(MASTER_DATA_YAML_PATH, 'r') as f:
        data = yaml.safe_load(f)
        
    names = data.get('names', [])
    if class_name not in names:
        print(f"Class '{class_name}' not found in AI dataset.")
        return
        
    class_id = names.index(class_name)
    
    # Remove from data.yaml
    names.pop(class_id)
    data['names'] = names
    data['nc'] = len(names)
    
    with open(MASTER_DATA_YAML_PATH, 'w') as f:
        yaml.dump(data, f, sort_keys=False)
        
    print(f"Removed {class_name} (ID: {class_id}) from data.yaml. Total classes now {data['nc']}")
    
    # Purge augmented files explicitly created by auto_annotator.py for this specific class
    prefix = class_name.replace(' ', '_') + '_'
    
    for split in ['train', 'valid', 'test']:
        images_dir = os.path.join(MASTER_DATASET_DIR, split, 'images')
        labels_dir = os.path.join(MASTER_DATASET_DIR, split, 'labels')
        
        if not os.path.exists(labels_dir):
            continue
            
        # Delete synthetic prefixed images explicitly
        if os.path.exists(images_dir):
            for img_file in glob.glob(os.path.join(images_dir, f"{prefix}*")):
                try:
                    os.remove(img_file)
                except Exception as e:
                    print(f"Could not remove {img_file}: {e}")
                    
        # Iterate over all label files to find labels with the class_id and fix shifts
        for label_file in glob.glob(os.path.join(labels_dir, "*.txt")):
            with open(label_file, 'r') as f:
                lines = f.readlines()
            
            new_lines = []
            has_deleted_class = False
            modified = False
            
            for line in lines:
                parts = line.strip().split()
                if not parts:
                    continue
                current_id = int(parts[0])
                
                if current_id == class_id:
                    has_deleted_class = True
                    modified = True
                    # Skip adding this line to effectively remove the bounding box
                elif current_id > class_id:
                    # Shift ID down by 1 to maintain YOLO contiguous indexing
                    new_id = current_id - 1
                    parts[0] = str(new_id)
                    new_lines.append(" ".join(parts) + "\n")
                    modified = True
                else:
                    new_lines.append(line)
                    
            if has_deleted_class and len(new_lines) == 0:
                # The image ONLY contained the deleted class. Delete both label and image.
                try:
                    os.remove(label_file)
                except Exception as e:
                    print(f"Could not remove {label_file}: {e}")
                base_name = os.path.splitext(os.path.basename(label_file))[0]
                for ext in ['.jpg', '.jpeg', '.png']:
                    img_path = os.path.join(images_dir, base_name + ext)
                    if os.path.exists(img_path):
                        try:
                            os.remove(img_path)
                        except:
                            pass
            elif modified:
                # Rewrite the label file with the shifted IDs
                with open(label_file, 'w') as f:
                    f.writelines(new_lines)

    print("AI Dataset cleanup complete.")

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        remove_class_from_ai_dataset(sys.argv[1])
