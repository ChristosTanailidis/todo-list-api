import { Migration } from '@mikro-orm/migrations';

export class Migration20210823111555 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table `user` (`id` varchar(255) not null, `name` varchar(255) not null, `email` varchar(255) not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `user` add primary key `user_pkey`(`id`);');
    this.addSql('alter table `user` add unique `user_email_unique`(`email`);');

    this.addSql('create table `list` (`id` varchar(255) not null, `slug` varchar(255) not null, `title` varchar(255) not null, `type` enum(\'work\', \'personal\', \'fun\') not null, `capacity` int(11) not null, `owner_id` varchar(255) not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `list` add primary key `list_pkey`(`id`);');
    this.addSql('alter table `list` add unique `list_slug_unique`(`slug`);');
    this.addSql('alter table `list` add index `list_owner_id_index`(`owner_id`);');

    this.addSql('create table `task` (`id` varchar(255) not null, `name` varchar(255) not null, `type` enum(\'work\', \'personal\', \'fun\') not null, `done` tinyint(1) not null, `list_id` varchar(255) not null) default character set utf8mb4 engine = InnoDB;');
    this.addSql('alter table `task` add primary key `task_pkey`(`id`);');
    this.addSql('alter table `task` add index `task_list_id_index`(`list_id`);');

    this.addSql('alter table `list` add constraint `list_owner_id_foreign` foreign key (`owner_id`) references `user` (`id`) on update cascade;');

    this.addSql('alter table `task` add constraint `task_list_id_foreign` foreign key (`list_id`) references `list` (`id`) on update cascade;');
  }

}
