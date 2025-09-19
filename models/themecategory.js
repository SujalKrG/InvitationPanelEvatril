"use strict";

export default (sequelize, DataTypes) => {
  const ThemeCategory = sequelize.define(
    "ThemeCategory",
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "theme_categories",
      timestamps: true,
      paranoid: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
    }
  );

  ThemeCategory.associate = (models) => {
    ThemeCategory.hasMany(models.Theme, {
      foreignKey: "category_id",
      as: "themes",
    });
  };

  return ThemeCategory;
};
