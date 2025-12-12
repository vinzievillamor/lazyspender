import React, { useState, useMemo } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Searchbar, Chip, Text, IconButton, Button, Surface } from 'react-native-paper';
import { shadows, spacing } from '../config/theme';
import { Category } from '../types/category';
import { getCategoryIcon } from '../utils/categoryIcons';

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
              elevation={0}
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
                    icon={() => getCategoryIcon(category, 18)}
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
    padding: spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    height: '80%',
    width: '100%',
    maxWidth: 600,
    borderRadius: 24,
    overflow: 'hidden',
    ...shadows.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
    paddingVertical: spacing.md,
  },
  descriptionContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  searchbar: {
    borderRadius: 12,
    ...shadows.sm,
  },
  categoriesContainer: {
    flex: 1,
  },
  categoriesContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    marginRight: 0,
    marginBottom: 0,
  },
  footer: {
    padding: spacing.xl,
  },
  backButton: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 0,
    ...shadows.sm,
  },
});

export default CategorySelectorModal;
