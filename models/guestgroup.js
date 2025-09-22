"use strict";

export default (sequelize, DataTypes) => {
  const GuestGroup = sequelize.define(
    "GuestGroups",
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "guest_groups",
      timestamps: true,
      underscored: true,
      paranoid: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
    }
  );

  // 🔹 Define associations here
  GuestGroup.associate = (models) => {
    GuestGroup.hasMany(models.GuestDirectories, {
      foreignKey: "group_id",
      as: "guests",
    });
  };

  return GuestGroup;
};
