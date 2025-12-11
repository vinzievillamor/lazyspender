import React, { useState, useMemo } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Searchbar, Chip, Text, IconButton, Button, Surface } from 'react-native-paper';
import { Category } from '../types/category';

interface CategorySelectorModalProps {
  visible: boolean;
  selectedCategory?: Category;
  onSelect: (category: Category) => void;
  onClose: () => void;
}

const CategorySelectorModal: React.FC<CategorySelectorModalProps> = ({
  visible,
  selectedCategory,
  onSelect,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return Object.values(Category);
    }

    const query = searchQuery.toLowerCase();
    return Object.values(Category).filter((category) =>
      category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSelectCategory = (category: Category) => {
    onSelect(category);
    setSearchQuery('');
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <Surface style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text variant="headlineSmall">Select Category</Text>
            <IconButton icon="close" onPress={handleClose} />
          </View>

          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text variant="bodyMedium">
              Select a category for your transaction
            </Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Searchbar
              placeholder="Search"
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchbar}
            />
          </View>

          {/* Categories */}
          <ScrollView
            style={styles.categoriesContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
          >
            <View style={styles.categoryGrid}>
              {filteredCategories.map((category) => {
                const isSelected = selectedCategory === category;
                return (
                  <Chip
                    key={category}
                    selected={isSelected}
                    onPress={() => handleSelectCategory(category)}
                    style={styles.chip}
                    showSelectedOverlay={isSelected}
                  >
                    {category}
                  </Chip>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Button
              mode="outlined"
              onPress={handleClose}
              style={styles.backButton}
            >
              Back
            </Button>
          </View>
        </Surface>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    height: '80%',
    width: '100%',
    maxWidth: 600,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 12,
  },
  descriptionContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchbar: {
    elevation: 0,
  },
  categoriesContainer: {
    flex: 1,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
  },
  footer: {
    padding: 20,
  },
  backButton: {
    width: '100%',
  },
});

export default CategorySelectorModal;
